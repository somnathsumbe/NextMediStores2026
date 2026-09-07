import Link from "next/link";
export default function NotFound(){return <main className="login-wrap"><section className="card login-box text-center"><div className="login-logo">404</div><h1 className="h4 mt-3">Page not found</h1><p className="muted">The page you requested does not exist.</p><Link href="/dashboard" className="btn btn-brand">Back to dashboard</Link></section></main>}
