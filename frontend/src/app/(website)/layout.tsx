import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getUser } from "@/lib/session";

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <>
      <Navbar user={user} />
      <div className="flex-grow pt-16">
        {children}
      </div>
      <Footer />
    </>
  );
}
