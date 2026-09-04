import { createElement, type CSSProperties, type ImgHTMLAttributes } from 'react';

type StaticImage = { src: string };

type NextImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> & {
    alt: string;
    fill?: boolean;
    priority?: boolean;
    src: string | StaticImage;
    unoptimized?: boolean;
};

const fillStyles: CSSProperties = {
    height: '100%',
    inset: 0,
    position: 'absolute',
    width: '100%',
};

export default function NextImageMock({ fill, priority: _priority, src, style, unoptimized: _unoptimized, ...props }: NextImageProps) {
    return createElement('img', {
        ...props,
        src: typeof src === 'string' ? src : src.src,
        style: fill ? { ...fillStyles, ...style } : style,
    });
}
