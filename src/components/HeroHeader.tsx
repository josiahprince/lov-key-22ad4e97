const HeroHeader = () => (
  <div className="text-center mb-6 space-y-3">
    <div className="flex items-center justify-center mb-4">
      <img src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" alt="LovKey Logo" className="w-20 h-20" />
    </div>

    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
      Welcome to LovKey
    </h1>

    <p className="text-xl md:text-2xl text-gray-700 font-medium italic">
      Low-key matching minds — before photos.
    </p>

    <div className="w-24 h-1 bg-gradient-to-r from-rose-500 to-orange-500 mx-auto rounded-full"></div>
  </div>
);

export default HeroHeader;
