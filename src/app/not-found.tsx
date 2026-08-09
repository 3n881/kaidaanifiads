import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-6xl font-black text-brand-200">404</p>
      <h1 className="font-deva mt-4 text-2xl font-extrabold text-brand-900">
        पान सापडले नाही
      </h1>
      <p className="font-deva mt-2 text-brand-500">
        तुम्ही शोधत असलेले पान उपलब्ध नाही किंवा हलवले गेले आहे.
      </p>
      <Link
        href="/"
        className="font-deva mt-6 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700"
      >
        मुख्यपृष्ठावर परत जा
      </Link>
    </div>
  );
}
