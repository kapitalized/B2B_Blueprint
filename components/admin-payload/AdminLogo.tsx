'use client';

import React from 'react';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';

export default function AdminLogo() {
  return (
    <Image
      src={BRAND.logo}
      alt={BRAND.name}
      width={120}
      height={32}
      className="h-8 w-auto object-contain"
      priority
    />
  );
}
