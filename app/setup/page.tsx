import Link from "next/link";

export default function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-6">
      <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold">Supabase is not configured</h1>
        <p className="text-slate-600 dark:text-slate-400">
          This deployment is missing the public Supabase environment variables.
          Add them in your host (for example Vercel → Project → Settings →
          Environment Variables), then redeploy:
        </p>
        <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
          <li>
            <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">
              NEXT_PUBLIC_SUPABASE_URL
            </code>
          </li>
          <li>
            <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
          </li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Values are in Supabase → Project Settings → API. Use the same names
          for Production and Preview if you use preview deployments.
        </p>
        <Link
          href="/login"
          className="inline-block text-blue-600 hover:underline font-medium"
        >
          Try sign in again after redeploying
        </Link>
      </div>
    </div>
  );
}
