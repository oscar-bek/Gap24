import StateAuth from "./_components/state";
import Social from "./_components/social";

import { ModeToggle } from "@/components/shared/mode-toggle";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Image from "next/image";

const Page = async () => {
  const session = await getServerSession(authOptions);
  if (session) return redirect("/");
  return (
    <div className="bg-background flex flex-col items-center justify-center h-screen px-4">
      <div className="container max-w-md w-full h-screen flex justify-center items-center flex-col space-y-4">
        <Image
          src="/gap_mod.png"
          alt="Gap Icon"
          width={160}
          height={160}
          className="text-blue-500"
        />
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-bold">Gap24</h1>
          <ModeToggle />
        </div>
        <StateAuth />
        <Social />
      </div>
    </div>
  );
};

export default Page;
