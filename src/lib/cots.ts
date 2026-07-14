export type CotKind = 'lower_cot' | 'upper_cot';
export type CotConfigurationType = 'bunker' | 'normal';

type CotRowLike = {
  cot_id_label: string;
};

type CotPayload = {
  room_id: string;
  cot_id_label: string;
  cot_type: CotKind;
};

function parseBunkLabel(label: string) {
  const match = /^([LU])(\d+)$/.exec(label);
  if (!match) return null;

  return {
    prefixRank: match[1] === 'L' ? 0 : 1,
    bunkNumber: Number(match[2]),
  };
}

export function createCotPayloadFromBunkCount(
  roomId: string,
  bunkCount: number,
  configurationType: CotConfigurationType,
): CotPayload[] {
  const payload: CotPayload[] = [];

  for (let bunkIndex = 1; bunkIndex <= bunkCount; bunkIndex += 1) {
    payload.push({
      room_id: roomId,
      cot_id_label: `L${bunkIndex}`,
      cot_type: 'lower_cot',
    });

    if (configurationType === 'bunker') {
      payload.push({
        room_id: roomId,
        cot_id_label: `U${bunkIndex}`,
        cot_type: 'upper_cot',
      });
    }
  }

  return payload;
}

export function sortCotsByBunkLabel<T extends CotRowLike>(cots: T[]): T[] {
  return [...cots].sort((a, b) => {
    const parsedA = parseBunkLabel(a.cot_id_label);
    const parsedB = parseBunkLabel(b.cot_id_label);

    if (parsedA && parsedB) {
      if (parsedA.bunkNumber !== parsedB.bunkNumber) {
        return parsedA.bunkNumber - parsedB.bunkNumber;
      }
      if (parsedA.prefixRank !== parsedB.prefixRank) {
        return parsedA.prefixRank - parsedB.prefixRank;
      }
      return a.cot_id_label.localeCompare(b.cot_id_label);
    }

    if (parsedA) return -1;
    if (parsedB) return 1;
    return a.cot_id_label.localeCompare(b.cot_id_label);
  });
}