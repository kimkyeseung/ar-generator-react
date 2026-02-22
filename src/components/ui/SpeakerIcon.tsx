import React from 'react'

interface SpeakerIconProps {
  muted: boolean
}

export const SpeakerIcon: React.FC<SpeakerIconProps> = ({ muted }) => (
  <img
    src={muted ? '/sound_off.png' : '/sound_on.png'}
    alt={muted ? '소리 꺼짐' : '소리 켜짐'}
    width={64}
    height={64}
    className="object-contain"
  />
)
