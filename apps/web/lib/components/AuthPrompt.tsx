import Link from "next/link";

interface AuthPromptProps {
  message: string;
}

export default function AuthPrompt({ message }: AuthPromptProps) {
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
      <p className="font-bold">Authentication Required</p>
      <p>{message}</p>
      <div className="mt-4">
        <Link
          href="/sign-in"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
