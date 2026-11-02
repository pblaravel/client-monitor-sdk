import type { PublicNetworkDTO, PublicTokenDTO } from './types';

/** Docs sometimes say `ethereum`; GET /public/networks uses `eth`. */
const NETWORK_SLUG_ALIASES: Record<string, string> = {
  ethereum: 'eth',
  ether: 'eth',
};

const normalizeSlug = (value: string): string => {
  const slug = value.trim().toLowerCase();
  return NETWORK_SLUG_ALIASES[slug] ?? slug;
};

export const findNetwork = (
  networks: PublicNetworkDTO[],
  slug: string
): PublicNetworkDTO | undefined => {
  const wanted = normalizeSlug(slug);
  return networks.find(
    (network) => normalizeSlug(network.slug) === wanted || network.name.toLowerCase() === slug.trim().toLowerCase()
  );
};

export type FindTokenQuery = {
  slug?: string;
  name?: string;
  type?: PublicTokenDTO['type'];
};

export const findToken = (
  network: PublicNetworkDTO,
  query: FindTokenQuery
): PublicTokenDTO | undefined => {
  const slug = query.slug?.trim().toLowerCase();
  const name = query.name?.trim().toLowerCase();

  return network.tokens.find((token) => {
    if (query.type && token.type !== query.type) {
      return false;
    }
    if (slug && token.slug.toLowerCase() !== slug) {
      return false;
    }
    if (name && token.name.toLowerCase() !== name) {
      return false;
    }
    return Boolean(slug || name || query.type);
  });
};

export const requireNetwork = (networks: PublicNetworkDTO[], slug: string): PublicNetworkDTO => {
  const network = findNetwork(networks, slug);
  if (!network) {
    const available = networks.map((item) => item.slug).join(', ');
    throw new Error(`Network "${slug}" was not found. Live slugs: ${available}`);
  }
  return network;
};

export const requireToken = (network: PublicNetworkDTO, query: FindTokenQuery): PublicTokenDTO => {
  const token = findToken(network, query);
  if (!token) {
    const hint = query.slug ?? query.name ?? String(query.type ?? '');
    throw new Error(`Token "${hint}" was not found on network "${network.slug}"`);
  }
  return token;
};
