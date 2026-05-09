import { useState } from "react";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username, password });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background p-4"
      dir="rtl"
    >
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center shadow-lg">
            <span className="text-2xl font-black text-[#1a2e05]">ف</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">فهد — لوحة التحكم</h1>
            <p className="text-sm text-muted-foreground mt-1">سجّل دخولك للمتابعة</p>
          </div>
        </div>

        {/* Form */}
        <Card className="border border-border rounded-[20px] shadow-none">
          <CardHeader className="pb-0" />
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium">
                  اسم المستخدم
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus
                  className="rounded-xl h-11"
                  disabled={login.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="rounded-xl h-11 pl-10"
                    disabled={login.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {login.isError && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {(login.error as Error).message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-[#CDEB63] hover:bg-[#b5d648] text-[#1a2e05] font-semibold rounded-xl"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جار الدخول...
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          بيانات الدخول الافتراضية:{" "}
          <span className="font-mono font-medium">admin / admin123</span>
        </p>
      </div>
    </div>
  );
}
