import { redirect } from "next/navigation";

// No landing page (PRD §8.1): boot straight into the console.
export default function Home() {
  redirect("/dashboard");
}
