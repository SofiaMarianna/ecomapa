import { useMemo } from 'react';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const iconOptions = {
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
};

export default function EcoPointMarker({
  point,
  isSelected,
  onSelect,
}) {
  const icon = useMemo(() => {
    const classes = ['leaflet-marker-icon', 'eco-point-marker'];

    if (point.is_demo) {
      classes.push('eco-point-marker--demo');
    }

    if (isSelected) {
      classes.push('eco-point-marker--selected');
    }

    return L.icon({
      ...iconOptions,
      className: classes.join(' '),
    });
  }, [isSelected, point.is_demo]);

  return (
    <Marker
      position={[point.latitude, point.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(point) }}
      alt={`Ponto de coleta: ${point.name}${point.is_demo ? ', demonstração' : ''}`}
    >
      <Popup>
        <strong>{point.name}</strong>
        {point.is_demo && <div>Ponto de demonstração — não confirmado</div>}
      </Popup>
    </Marker>
  );
}
