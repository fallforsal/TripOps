using System.Text.RegularExpressions;
using TripOps.Data.Entities;

namespace TripOps.Service.Ai;

/// <summary>Khách đang hỏi gì so với danh sách tour vừa gợi ý.</summary>
public enum GuestIntent
{
    /// <summary>Chưa có danh sách tour trước: xử lý như câu hỏi bình thường.</summary>
    NoContext,
    /// <summary>Hỏi tiếp về danh sách vừa gợi ý ("tour nào rẻ nhất", "tour thứ hai", "những địa điểm đó").</summary>
    FollowUp,
    /// <summary>Yêu cầu tìm mới hoặc đổi tiêu chí (điểm đến, ngân sách, số khách, thời lượng).</summary>
    NewSearch,
    /// <summary>Câu khác (chính sách, cảm ơn...): giữ nguyên danh sách, không tự tìm tour mới.</summary>
    Other,
}

/// <summary>
/// Ngữ cảnh "danh sách tour vừa gợi ý" của Guest AI. Frontend chỉ gửi ID; backend tải lại tour CÔNG KHAI theo ID,
/// bỏ tour không còn mở bán, và dùng dữ liệu trong hệ thống (không tin giá/nội dung do client gửi).
/// </summary>
public sealed record GuestTourContext(IReadOnlyList<Tour> Tours, int Removed)
{
    public static readonly GuestTourContext Empty = new(Array.Empty<Tour>(), 0);
    public bool HadList => Tours.Count > 0 || Removed > 0;
    public IReadOnlyList<int> Ids => Tours.Select(t => t.Id).ToList();
}

/// <summary>Nhận biết câu hỏi tiếp theo về danh sách tour (so khớp không dấu).</summary>
public static partial class GuestFollowUp
{
    // Cụm cho biết khách nói về danh sách vừa gợi ý.
    private static readonly string[] Reference =
    [
        "vua goi y", "vua roi", "vua neu", "vua tim", "o tren", "ben tren", "phia tren", "danh sach tren", "danh sach vua",
        "trong danh sach", "trong so", "trong cac tour", "trong nhung tour", "cac tour do", "nhung tour do", "cac tour nay",
        "nhung tour nay", "tour do", "tour nay", "ca 5", "cac tour tren", "nhung tour tren",
        "dia diem do", "cac dia diem", "nhung dia diem", "nhung noi do", "cac noi do", "re nhat", "dat nhat", "gia thap nhat",
        "gia cao nhat", "ngan nhat", "dai nhat", "it ngay nhat", "nhieu ngay nhat", "dau tien", "cuoi cung", "so sanh",
    ];

    // Cụm cho biết khách muốn tìm danh sách mới.
    private static readonly string[] NewSearchPhrases =
    [
        "tour khac", "tim them", "goi y them", "goi y khac", "tim lai", "tim tour moi", "tour moi", "doi diem den",
        "doi sang", "chuyen sang", "thay vao do", "con tour nao khac", "danh sach moi", "cac tour khac", "lua chon khac",
    ];

    // Từ hay gặp trong câu hỏi tiếp theo, không phải tên địa danh.
    private static readonly HashSet<string> FollowWords = new(StringComparer.Ordinal)
    {
        "vua", "roi", "tren", "duoi", "danh", "sach", "trong", "nay", "kia", "may", "nhat", "thu", "hai", "bon", "nam", "sau",
        "bay", "tam", "chin", "muoi", "dau", "tien", "cuoi", "cung", "sanh", "so", "dia", "diem", "noi", "lich", "trinh", "mo",
        "ta", "chi", "tiet", "thong", "tin", "gioi", "thieu", "tham", "quan", "rang", "hon", "thap", "cao", "dat", "ngan", "dai",
        "it", "nhieu", "nhung", "cac", "neu", "phan", "biet", "khac", "nhau", "giong", "bao", "gom", "an", "uong", "khach",
        "san", "phong", "nghi", "xe", "hdv", "huong", "dan", "vien", "mat", "tien", "phi", "huy", "coc", "thanh", "toan",
        "dang", "ky", "the", "sao", "lam", "giup", "xem", "cho", "biet", "voi", "duoc", "hop", "phu", "nen", "chon", "ok",
        "cam", "on", "thich", "hoi", "them", "tour", "tours", "mot", "nao", "gia", "re", "lich", "khoi", "hanh", "ngay",
    };

    public static bool RefersToList(string folded) =>
        Reference.Any(p => Contains(folded, p)) || OrdinalPattern().IsMatch(folded) || NumberedPattern().IsMatch(folded);

    public static bool AsksNewSearch(string folded) => NewSearchPhrases.Any(p => Contains(folded, p));

    /// <summary>Từ khóa (thường là địa danh) không có trong tên/điểm đến của các tour đang bàn.</summary>
    public static IReadOnlyList<string> UnknownWords(string question, IReadOnlyList<Tour> context)
    {
        var known = " " + string.Join(' ', context.Select(t => GuestAssistantKnowledge.Fold($"{t.Name} {t.Destination} {t.DepartureLocation}"))) + " ";
        var compact = known.Replace(" ", string.Empty);
        return GuestAssistantKnowledge.Fold(question).Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length >= 3 && !w.All(char.IsDigit) && !FollowWords.Contains(w) && !PublicTourFinder.IsStopWord(w))
            .Where(w => !known.Contains($" {w} ", StringComparison.Ordinal) && !(w.Length >= 4 && compact.Contains(w, StringComparison.Ordinal)))
            .Distinct().ToList();
    }

    /// <summary>"tour thứ hai", "tour số 2", "tour đầu tiên", "tour cuối cùng" → vị trí (1-based) trong danh sách.</summary>
    public static int? Position(string folded, int count)
    {
        if (Contains(folded, "dau tien") || Contains(folded, "thu nhat")) return 1;
        if (Contains(folded, "cuoi cung") || Contains(folded, "cuoi danh sach")) return count;
        var m = OrdinalPattern().Match(folded);
        if (!m.Success) m = NumberedPattern().Match(folded);
        if (!m.Success) return null;
        var word = m.Groups[1].Value;
        return word switch
        {
            "nhat" or "mot" => 1, "hai" => 2, "ba" => 3, "tu" or "bon" => 4, "nam" => 5, "sau" => 6, "bay" => 7, "tam" => 8,
            _ => int.TryParse(word, out var n) ? n : null,
        };
    }

    public static bool Has(string folded, params string[] phrases) => phrases.Any(p => Contains(folded, p));

    private static bool Contains(string folded, string phrase) => $" {folded} ".Contains($" {phrase} ", StringComparison.Ordinal);

    [GeneratedRegex(@"\bthu (nhat|hai|ba|tu|bon|nam|sau|bay|tam|\d)\b")]
    private static partial Regex OrdinalPattern();
    [GeneratedRegex(@"\b(?:tour|so) (\d)\b(?! ?(?:ngay|dem|nguoi|khach|trieu|tr|nghin|k)\b)")]
    private static partial Regex NumberedPattern();
}
