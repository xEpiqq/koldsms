import Link from "next/link";
import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Since async Client Components aren't supported yet, remove "use client" and "async" here.
// Also remove any direct awaiting of props. This now behaves as a Server Component.
export default function Login({
  searchParams,
}: {
  searchParams?: Message; // Adjust the type as needed if you have a different structure
}) {
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden">
      {/* Form side (left) */}
      <div className="flex w-full md:w-1/2 flex-col justify-center items-center bg-gradient-to-br from-purple-500 to-pink-500 p-6">
        <div className="bg-white w-full max-w-md p-8 rounded-md shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Sign In</h1>
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              className="font-semibold text-purple-600 hover:underline"
              href="/sign-up"
            >
              Sign up
            </Link>
          </p>

          {/* The actual form */}
          <form className="flex flex-col mt-8">
            <div className="flex flex-col gap-2 mb-4">
              <Label className="text-gray-700" htmlFor="email">
                Email
              </Label>
              <Input
                name="email"
                placeholder="you@example.com"
                required
                className="p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex justify-between items-center">
                <Label className="text-gray-700" htmlFor="password">
                  Password
                </Label>
                <Link
                  className="text-sm text-purple-600 hover:underline"
                  href="/forgot-password"
                >
                  Forgot Password?
                </Link>
              </div>
              <Input
                type="password"
                name="password"
                placeholder="Your password"
                required
                className="p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="mb-4">
              {/* Use your server action for form submission */}
              <SubmitButton
                pendingText="Signing In..."
                formAction={signInAction}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
              >
                Sign in
              </SubmitButton>
            </div>
            {/* Display any messages passed via searchParams */}
            <FormMessage message={searchParams} />
          </form>
        </div>
      </div>

      {/* Image / Decorative side (right) */}
      <div
        className="hidden md:flex md:w-1/2 bg-cover bg-center bg-no-repeat"
        style={{
          // Replace '/images/login-bg.jpg' with the correct path to your image
          backgroundImage: "url('/images/login-bg.jpg')",
        }}
      ></div>
    </div>
  );
}
