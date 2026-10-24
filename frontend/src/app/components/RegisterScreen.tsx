import { useState } from "react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Building2,
  MapPin,
  FileText,
  Hash,
  ImagePlus,
  XCircle,
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/app/components/ui/input-otp";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/app/components/ui/radio-group";
import { ProviderType } from "@/app/types";

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onBack: () => void;
}

export function RegisterScreen({
  onRegisterSuccess,
  onBack,
}: RegisterScreenProps) {
  const [accountType, setAccountType] = useState<
    "customer" | "provider"
  >("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [step, setStep] = useState<"info" | "otp">("info");
  const [otpValue, setOtpValue] = useState("");

  // Customer fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Provider fields
  const [providerType, setProviderType] =
    useState<ProviderType>("accommodation");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [avatar, setAvatar] = useState<string>("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const providerTypes = [
    {
      value: "accommodation",
      label: "Dịch vụ lưu trú",
      desc: "Khách sạn, Homestay, Nhà nghỉ",
    },
    {
      value: "guide",
      label: "Cung cấp hướng dẫn viên",
      desc: "Dịch vụ hướng dẫn du lịch",
    },
    {
      value: "food",
      label: "Dịch vụ ăn uống",
      desc: "Nhà hàng, Quán ăn, Cà phê",
    },
    {
      value: "attraction",
      label: "Điểm tham quan & Giải trí",
      desc: "Công viên, Điểm tham quan",
    },
    {
      value: "adventure",
      label: "Hoạt động trải nghiệm",
      desc: "Leo núi, Lặn biển, Nhảy dù",
    },
    {
      value: "support",
      label: "Dịch vụ hỗ trợ",
      desc: "Nhiếp ảnh và các dịch vụ khác",
    },
  ];

  const handleSendOTP = () => {
    setError("");

    // Validate
    if (
      !username ||
      !email ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (accountType === "provider") {
      if (
        !businessName ||
        !businessAddress ||
        !businessPhone ||
        !businessEmail ||
        !taxCode
      ) {
        setError("Vui lòng điền đầy đủ thông tin doanh nghiệp");
        return;
      }
      if (!avatar) {
        setError("Vui lòng tải lên ảnh đại diện");
        return;
      }
    }

    setIsLoading(true);
    // Simulate sending OTP
    setTimeout(() => {
      setIsLoading(false);
      setStep("otp");
    }, 1000);
  };

  const handleVerifyOTP = () => {
    if (otpValue.length !== 6) {
      setError("Vui lòng nhập đầy đủ mã OTP");
      return;
    }

    setIsLoading(true);
    // Simulate OTP verification
    setTimeout(() => {
      setIsLoading(false);
      if (otpValue === "123456") {
        alert("Đăng ký thành công! Vui lòng đăng nhập.");
        onRegisterSuccess();
      } else {
        setError("Mã OTP không chính xác. Vui lòng thử lại.");
      }
    }, 1000);
  };

  return (
    <div className="py-20">
      <div className="max-w-2xl w-full mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Đăng ký tài khoản
          </h2>

          {step === "info" ? (
            <>
              {/* Account Type Tabs */}
              <Tabs
                value={accountType}
                onValueChange={(v) =>
                  setAccountType(v as "customer" | "provider")
                }
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="customer">
                    Khách hàng
                  </TabsTrigger>
                  <TabsTrigger value="provider">
                    Nhà cung cấp
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form className="space-y-4">
                {/* Common Fields */}
                <div>
                  <Label htmlFor="username">
                    Tên người dùng *
                  </Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value)
                      }
                      placeholder="Nhập tên của bạn"
                      className="pl-11"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="pl-11"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Số điện thoại *</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678"
                      className="pl-11"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Mật khẩu *</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Ít nhất 6 ký tự"
                      className="pl-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">
                    Xác nhận mật khẩu *
                  </Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      placeholder="Nhập lại mật khẩu"
                      className="pl-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword,
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Provider-specific fields */}
                {accountType === "provider" && (
                  <>
                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold mb-3 block">
                        Loại dịch vụ cung cấp *
                      </Label>
                      <RadioGroup
                        value={providerType}
                        onValueChange={(v) =>
                          setProviderType(v as ProviderType)
                        }
                      >
                        <div className="space-y-2">
                          {providerTypes.map((type) => (
                            <div
                              key={type.value}
                              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                            >
                              <RadioGroupItem
                                value={type.value}
                                id={type.value}
                                className="mt-1"
                              />
                              <label
                                htmlFor={type.value}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="font-medium text-gray-900">
                                  {type.label}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {type.desc}
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-base font-semibold mb-3">
                        Thông tin doanh nghiệp
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="businessName">
                            Tên doanh nghiệp *
                          </Label>
                          <div className="relative mt-1">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="businessName"
                              value={businessName}
                              onChange={(e) =>
                                setBusinessName(e.target.value)
                              }
                              placeholder="Tên doanh nghiệp/cơ sở"
                              className="pl-11"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="businessAddress">
                            Địa chỉ *
                          </Label>
                          <div className="relative mt-1">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="businessAddress"
                              value={businessAddress}
                              onChange={(e) =>
                                setBusinessAddress(
                                  e.target.value,
                                )
                              }
                              placeholder="Địa chỉ doanh nghiệp"
                              className="pl-11"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="businessPhone">
                            Số điện thoại liên hệ *
                          </Label>
                          <div className="relative mt-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="businessPhone"
                              type="tel"
                              value={businessPhone}
                              onChange={(e) =>
                                setBusinessPhone(e.target.value)
                              }
                              placeholder="Số điện thoại doanh nghiệp"
                              className="pl-11"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="businessEmail">
                            Email liên hệ *
                          </Label>
                          <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="businessEmail"
                              type="email"
                              value={businessEmail}
                              onChange={(e) =>
                                setBusinessEmail(e.target.value)
                              }
                              placeholder="Email doanh nghiệp"
                              className="pl-11"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="taxCode">
                            Mã số thuế *
                          </Label>
                          <div className="relative mt-1">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="taxCode"
                              value={taxCode}
                              onChange={(e) =>
                                setTaxCode(e.target.value)
                              }
                              placeholder="Mã số thuế"
                              className="pl-11"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="avatar">
                            Ảnh đại diện *
                          </Label>
                          <div className="mt-1">
                            {avatar ? (
                              <div className="relative w-32 h-32 mx-auto">
                                <img
                                  src={avatar}
                                  alt="Avatar preview"
                                  className="w-full h-full object-cover rounded-lg border-2 border-gray-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => setAvatar("")}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label
                                htmlFor="avatar"
                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                              >
                                <ImagePlus className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-500">
                                  Nhấn để tải ảnh lên
                                </span>
                                <input
                                  id="avatar"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file =
                                      e.target.files?.[0];
                                    if (file) {
                                      const reader =
                                        new FileReader();
                                      reader.onloadend = () => {
                                        setAvatar(
                                          reader.result as string,
                                        );
                                      };
                                      reader.readAsDataURL(
                                        file,
                                      );
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 text-center">
                      {error}
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Đang gửi..." : "Gửi mã OTP"}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* OTP Verification */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#E0F2FE] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-[#F97316]" />
                </div>
                <p className="text-gray-600">
                  Mã OTP đã được gửi đến email:
                  <br />
                  <span className="font-semibold text-gray-900">
                    {email}
                  </span>
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-center block mb-3">
                    Nhập mã OTP (6 chữ số)
                  </Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpValue}
                      onChange={(value) => {
                        setOtpValue(value);
                        setError("");
                      }}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 text-center">
                      {error}
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otpValue.length !== 6}
                  className="w-full"
                >
                  {isLoading
                    ? "Đang xác thực..."
                    : "Xác thực OTP"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep("info")}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← Quay lại
                  </button>
                  <span className="mx-2 text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="text-sm text-[#F97316] hover:underline"
                  >
                    Gửi lại mã OTP
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 text-center">
                  💡 Demo: Sử dụng mã OTP{" "}
                  <code className="bg-white px-2 py-0.5 rounded font-mono">
                    123456
                  </code>
                </p>
              </div>
            </>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Đã có tài khoản?{" "}
              <button
                onClick={onBack}
                className="text-[#F97316] hover:underline font-semibold"
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}