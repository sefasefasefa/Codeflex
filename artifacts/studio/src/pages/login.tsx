import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="max-w-md w-full p-8 border border-border bg-card rounded-lg flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-2">AI Studio</h1>
        <p className="text-muted-foreground mb-8 text-center">Giriş yapmak için devam edin.</p>
        <Button onClick={login} className="w-full">
          Giriş Yap
        </Button>
      </div>
    </div>
  );
}