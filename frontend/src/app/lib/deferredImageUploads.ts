type ImageUploader = (file: File) => Promise<string>;

// Browser object URLs are previews only. Resolve them to uploaded URLs immediately before saving.
export class DeferredImageUploads {
  private files = new Map<string, File>();
  private uploaded = new Map<string, string>();
  private pending = new Map<string, Promise<string>>();

  stage(files: File[]): string[] {
    for (const file of files) {
      if (!["image/png", "image/jpeg"].includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024)
        throw new Error("Chỉ nhận ảnh PNG/JPEG tối đa 5 MB.");
    }
    return files.map(file => {
      const preview = URL.createObjectURL(file);
      this.files.set(preview, file);
      return preview;
    });
  }

  entries(urls: string[]): { url: string; file: File }[] {
    return urls.flatMap(url => this.files.has(url) ? [{ url, file: this.files.get(url)! }] : []);
  }

  async resolve(urls: string[], upload: ImageUploader): Promise<string[]> {
    const result: string[] = [];
    for (const url of urls) {
      const cached = this.uploaded.get(url);
      if (cached) { result.push(cached); continue; }
      const file = this.files.get(url);
      if (!file) {
        if (url.startsWith("blob:") || url.startsWith("data:"))
          throw new Error("Ảnh xem trước không còn hợp lệ. Vui lòng chọn lại ảnh.");
        result.push(url);
        continue;
      }
      let request = this.pending.get(url);
      if (!request) {
        request = upload(file).then(uploadedUrl => {
          if (!uploadedUrl.startsWith("https://")) throw new Error("Máy chủ chưa trả về URL ảnh Cloudinary hợp lệ.");
          this.uploaded.set(url, uploadedUrl);
          return uploadedUrl;
        }).finally(() => this.pending.delete(url));
        this.pending.set(url, request);
      }
      result.push(await request);
    }
    return result;
  }

  retain(urls: string[]): void {
    const keep = new Set(urls);
    for (const preview of this.files.keys()) {
      if (keep.has(preview)) continue;
      URL.revokeObjectURL(preview);
      this.files.delete(preview);
      this.uploaded.delete(preview);
    }
  }

  dispose(): void { this.retain([]); }
}
