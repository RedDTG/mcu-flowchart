import Link from "next/link";

const githubUrl = "https://github.com/RedDTG/mcu-flowchart";
const footerLinks = [
    { href: "/all-media", label: "Explore" },
    { href: "/flowchart", label: "Flowchart" },
    { href: "/watching-order", label: "Q&A" },
] as const;

export function SiteFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="relative border-t border-zinc-800/80 bg-linear-to-b from-zinc-950 to-black text-zinc-300">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-red-500/45 to-transparent" />

            <div className="mx-auto grid w-full max-w-7xl items-center gap-3 px-4 py-4 text-sm md:grid-cols-3">
                <p className="text-zinc-500">© {year} MCU Flowchart</p>

                <p className="text-zinc-400 md:justify-self-center md:text-center">Built with passion by fans. Contributions are welcome.</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-self-end">
                    <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {footerLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="text-zinc-300 transition hover:text-white">
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <span className="hidden text-zinc-700 sm:inline">•</span>

                    <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-semibold text-red-300 transition hover:text-red-200"
                    >
                        GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
}
