const PLAYER_COLORS = Array.from(
    { length: 50 },
    (_, i) => `hsl(${(i * 137) % 360} ${65 + (i % 3) * 10}% ${45 + (i % 5) * 5}%)`
);

export function getPlayerColor(name: string): string {
    let hash = 0;

    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) % PLAYER_COLORS.length;
    }

    return PLAYER_COLORS[hash];
}
