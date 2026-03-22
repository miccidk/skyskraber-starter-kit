export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://www.skyskraber.dk';
export const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || '';
export const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5180/callback';
export const SCOPES = 'user:profile:read';

// Item type name translations (from Skyskraber engine)
const ITEM_TYPE_NAMES: Record<string, string> = {
	item: 'Ting',
	background: 'Baggrund',
	case: 'Kasse',
	object: 'Objekt',
	robot: 'Robot',
	chest: 'Kiste',
	'kick-kon-button': 'Kick Kon knap',
	dice: 'Terning',
};
export const getItemTypeName = (type: string): string => ITEM_TYPE_NAMES[type] ?? type;

// Wearable type name translations
const WEARABLE_TYPE_NAMES: Record<string, string> = {
	head: 'Hoved',
	hair: 'Hår',
	eyes: 'Øjne',
	mouth: 'Mund',
	right: 'Højre',
	left: 'Venstre',
	body: 'Krop',
	other: 'Andet',
};
export const getWearableTypeName = (type: string): string => WEARABLE_TYPE_NAMES[type] ?? type;

// Wearable sex name translations
const WEARABLE_SEX_NAMES: Record<string, string> = {
	male: 'Mand',
	female: 'Kvinde',
	unisex: 'Unisex',
};
export const getWearableSexName = (sex: string): string => WEARABLE_SEX_NAMES[sex] ?? sex;
