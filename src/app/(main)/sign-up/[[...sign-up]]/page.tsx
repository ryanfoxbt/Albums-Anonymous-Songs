import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-4">
      <SignUp />
    </main>
  );
}
