import type { SpeciesImage } from '@/services/api/gbif.service';

export function ImageCredit({ image }: { image: SpeciesImage }) {
  const licenseLink = image.licenseUrl || (/^https?:\/\//.test(image.license) ? image.license : image.occurrenceUrl);
  return <small>
    {Array.from(new Set([image.creator, image.rightsHolder].filter(Boolean))).join(' / ') || 'Autoria não informada'}
    {' · '}<a href={licenseLink} target="_blank" rel="noreferrer">{image.license}</a>
    {' · '}<a href={image.occurrenceUrl} target="_blank" rel="noreferrer">Origem no GBIF</a>
  </small>;
}
