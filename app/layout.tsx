import "./styles.css";
export const metadata = { title: "Friends Included", description: "Finance system for fictional wedding guests" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
