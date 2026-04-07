export const ImageLoadingSpinner = () => (
  <div className="bg-gray-800/10 animate-pulse flex items-center justify-center w-full h-full rounded">
    <div
      className="animate-spin border-t-transparent border-4 border-purple-500 rounded-full"
      style={{ width: '32px', height: '32px' }}
    />
  </div>
);
