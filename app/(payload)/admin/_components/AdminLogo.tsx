'use client';

import React from 'react';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';

export default function AdminLogo() {
  return (
    <span className="inline-block max-h-8 max-w-[120px] shrink-0">
      <Image
        src={BRAND.logo}
        alt={BRAND.name}
        width={120}
        height={32}
        className="h-8 w-auto max-h-8 object-contain"
        priority
      />
    </span>
  );
}
