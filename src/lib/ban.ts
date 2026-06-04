export interface IgnSuggestion {
  fulltext: string;
  city: string;
  zipcode: string;
  street: string;
  kind: string;
  classification: number;
  x?: number;
  y?: number;
}

export interface IgnResponse {
  status: string;
  results: IgnSuggestion[];
}

export async function searchAddress(query: string): Promise<IgnSuggestion[]> {
  if (!query || query.length < 3) return [];

  try {
    const response = await fetch(
      `https://data.geopf.fr/geocodage/completion/?text=${encodeURIComponent(
        query,
      )}&type=StreetAddress&maximumResponses=10`,
    );

    if (!response.ok) {
      throw new Error("Error fetching address suggestions");
    }

    const data: IgnResponse = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}
