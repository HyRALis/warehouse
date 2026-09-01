import Image from 'next/image';
import Link from 'next/link';
import { PackageX } from 'lucide-react';
import type { Product } from '@inventory-system/contracts';
import { ProductStatusBadge } from './ProductStatusBadge';

export const ProductCard = ({ product }: { product: Product }) => {
    const image = product.images[0];
    return <Link href={`/dashboard/products/${product.id}`} className="group block overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-slate-950">
            {image ? <Image src={image.imageUrl} alt={product.baseName} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                : <div className="flex flex-col items-center text-slate-400"><PackageX className="mb-2 h-8 w-8" /><span className="text-xs font-medium uppercase">No image</span></div>}
            <div className="absolute right-3 top-3"><ProductStatusBadge status={product.status} /></div>
        </div>
        <div className="p-4"><h2 className="truncate font-semibold text-slate-100 transition-colors group-hover:text-indigo-400" title={product.baseName}>{product.baseName}</h2>
            <div className="mt-2 flex items-center justify-between gap-3"><span className="truncate font-mono text-sm text-slate-400">{product.sku}</span><span className="max-w-[120px] truncate rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{product.category?.name || 'Uncategorized'}</span></div>
        </div>
    </Link>;
};
