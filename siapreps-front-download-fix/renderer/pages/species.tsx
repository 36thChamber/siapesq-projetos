import React from 'react';
import SideBar from '../components/atoms/sideBar';
import EcologicalModels from '../components/species';

export default function Species() {
  return (
    <div className="flex w-screen h-screen bg-dark_gray overflow-hidden">
      <div className="h-full">
        <SideBar />
      </div>
      <main className="flex-1 h-full overflow-hidden">
        <EcologicalModels />
      </main>

    </div>
  );
}