import { useEffect } from 'react';

interface SeoProps {
	title: string;
	description: string;
	image?: string;
	type?: 'website' | 'article';
	canonical?: string;
	noIndex?: boolean;
}

function setMeta(name: string, content: string, property = false) {
	const attr = property ? 'property' : 'name';
	let el = document.querySelector(`meta[${attr}="${name}"]`);
	if (!el) {
		el = document.createElement('meta');
		el.setAttribute(attr, name);
		document.head.appendChild(el);
	}
	el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
	let el = document.querySelector(`link[rel="${rel}"]`);
	if (!el) {
		el = document.createElement('link');
		el.setAttribute('rel', rel);
		document.head.appendChild(el);
	}
	el.setAttribute('href', href);
}

export function Seo({ title, description, image, type = 'website', canonical, noIndex }: SeoProps) {
	useEffect(() => {
		const suffix = ' — Skyskraber Fan Site';
		document.title = title.includes('Skyskraber') ? title : title + suffix;

		setMeta('description', description);
		setMeta('og:title', title, true);
		setMeta('og:description', description, true);
		setMeta('og:type', type, true);
		setMeta('twitter:card', 'summary');
		setMeta('twitter:title', title);
		setMeta('twitter:description', description);

		if (image) {
			setMeta('og:image', image, true);
			setMeta('twitter:image', image);
		}

		if (canonical) {
			setLink('canonical', canonical);
			setMeta('og:url', canonical, true);
		}

		if (noIndex) {
			setMeta('robots', 'noindex,nofollow');
		}
	}, [title, description, image, type, canonical, noIndex]);

	return null;
}
