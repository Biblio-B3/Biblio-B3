import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404 - Page non trouvée</h1>
      <p className="text-lg mb-8">La page que vous cherchez n'existe pas.</p>
      <Link href="/books" className="text-blue-500 hover:underline">
        Retour aux livres
      </Link>
    </div>
  );
}