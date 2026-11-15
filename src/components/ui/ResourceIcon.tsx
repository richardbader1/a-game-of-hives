import type { ResourceType } from '../../game/types';

/** One original SVG per resource, shared by DOM controls and board textures. */
export const resourceIconUrl = (resource: ResourceType) => `${import.meta.env.BASE_URL}assets/resource-icons/${resource}.svg`;
export function ResourceIcon({ resource }: { resource: ResourceType }) {
  return <img className="resource-symbol" data-resource-icon={resource} src={resourceIconUrl(resource)} alt="" aria-hidden="true" draggable={false} />;
}
