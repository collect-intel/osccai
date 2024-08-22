import { login, signup } from "./actions";

export default function LoginPage() {
  return (
    <form className="flex flex-col">
      <div className="flex flex-row">
        <label htmlFor="email">Name:</label>
        <input id="name" name="name" type="text" />
        <label htmlFor="email">Email:</label>
        <input id="email" name="email" type="email" required />
        <label htmlFor="password">Password:</label>
        <input id="password" name="password" type="password" required />
      </div>
      <div className="flex flex-row">
        <button formAction={login}>Log in</button>
        <button formAction={signup}>Sign up</button>
      </div>
    </form>
  );
}
