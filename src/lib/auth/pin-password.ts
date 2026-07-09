export function getHostelerAuthPassword(phone: string, pin: string) {
	return `pin:${phone}:${pin}`;
}