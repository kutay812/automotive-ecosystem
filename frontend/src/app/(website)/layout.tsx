import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getUser } from "@/lib/session";
import { getAdminUser } from "@/lib/admin-session";

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const admin = await getAdminUser();

  return (
    <>
      <Navbar user={user} adminRole={admin?.role} />
      <div className="flex-grow pt-16">
        {children}
      </div>
      <Footer />
    </>
  );
}
