export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-white text-black dark:bg-black dark:text-white">
      <h2 className="text-2xl font-bold mb-4">404 - Page Not Found</h2>
      <p className="text-gray-500 dark:text-gray-400">Could not find requested resource</p>
    </div>
  );
}
