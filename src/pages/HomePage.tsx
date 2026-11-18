export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 md:px-6">
      <h1>
        <span className="block">駭你好，先別點！</span>
        <span className="mt-2 block">
          貼上網址，用
          <em className="text-primary not-italic underline decoration-4 underline-offset-8">白話</em>
          告訴你能不能點
        </span>
      </h1>
    </div>
  );
}
