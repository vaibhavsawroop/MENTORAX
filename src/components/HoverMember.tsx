import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface HoverMemberItem {
  name: string
  role: string
  image?: string
  initials: string
}

interface HoverMemberProps {
  teamMembers: HoverMemberItem[]
  defaultText?: string
  backgroundColor?: string
  textColor?: string
  hoverTextColor?: string
  scrollTarget?: string
}

// Detect if the device supports touch (coarse pointer)
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    )
  }, [])
  return isTouch
}

// Animate characters one-by-one with stagger
function AnimatedText({ text, color }: { text: string; color: string }) {
  const chars = text.split('')
  return (
    <motion.span
      style={{ display: 'flex', flexWrap: 'nowrap', overflow: 'hidden', color }}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {chars.map((char, i) => (
        <motion.span
          key={i}
          style={{ display: 'inline-block', willChange: 'transform, opacity' }}
          variants={{
            hidden: { y: '110%', opacity: 0 },
            visible: {
              y: '0%',
              opacity: 1,
              transition: {
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
                delay: i * 0.022,
              },
            },
            exit: {
              y: '-110%',
              opacity: 0,
              transition: {
                duration: 0.3,
                ease: [0.55, 0, 0.78, 0],
                delay: i * 0.012,
              },
            },
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  )
}

export function HoverMember({
  teamMembers,
  defaultText = 'OUR TEAM',
  backgroundColor = '#0d0d0d',
  textColor = '#ffffff',
  hoverTextColor = '#ffffff',
  scrollTarget = '#team-contact',
}: HoverMemberProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const isTouch = useIsTouchDevice()

  // On mobile: tap outside any avatar to deselect
  const handleRootClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isTouch) return
      const target = e.target as HTMLElement
      // If tapped outside any avatar bubble, deselect
      if (!target.closest('.hover-member-avatar-wrap')) {
        setActiveIndex(null)
      }
    },
    [isTouch],
  )

  const handleAvatarInteraction = useCallback(
    (index: number) => {
      if (isTouch) {
        // Toggle on tap
        setActiveIndex((prev) => (prev === index ? null : index))
      } else {
        setActiveIndex(index)
      }
    },
    [isTouch],
  )

  const handleAvatarLeave = useCallback(() => {
    if (!isTouch) {
      setActiveIndex(null)
    }
  }, [isTouch])

  const displayText =
    activeIndex !== null
      ? teamMembers[activeIndex].name.toUpperCase()
      : defaultText.toUpperCase()

  const activeColor = activeIndex !== null ? hoverTextColor : textColor

  return (
    <div
      className={`hover-member-root ${isTouch ? 'is-touch-member' : ''}`}
      style={{ '--hover-member-bg': backgroundColor } as React.CSSProperties}
      onClick={handleRootClick}
    >
      {/* Avatar row */}
      <div className="hover-member-avatars">
        {teamMembers.map((member, index) => (
          <motion.div
            key={member.name}
            className={`hover-member-avatar-wrap ${activeIndex === index ? 'is-hovered' : ''} ${activeIndex !== null && activeIndex !== index ? 'is-dimmed' : ''}`}
            onMouseEnter={() => !isTouch && setActiveIndex(index)}
            onMouseLeave={handleAvatarLeave}
            onClick={(e) => {
              e.stopPropagation()
              handleAvatarInteraction(index)
            }}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => !isTouch && setActiveIndex(null)}
            whileHover={isTouch ? undefined : { y: -8, scale: 1.04 }}
            animate={isTouch && activeIndex === index ? { y: -8, scale: 1.04 } : { y: 0, scale: 1 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            tabIndex={0}
            role="group"
            aria-label={`${member.name}, ${member.role}`}
          >
            {member.image ? (
              <img
                src={member.image}
                alt={member.name}
                className="hover-member-avatar-img"
                draggable={false}
              />
            ) : (
              <div className="hover-member-avatar-placeholder">
                {member.initials}
              </div>
            )}
            {/* Name tooltip — always visible for active member on touch */}
            <AnimatePresence>
              {activeIndex === index && (
                <motion.div
                  className="hover-member-tooltip"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="hover-member-tooltip-name">{member.name}</span>
                  <span className="hover-member-tooltip-role">{member.role}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Big animated text */}
      <div className="hover-member-text-wrap" aria-live="polite" aria-label={displayText}>
        <div className="hover-member-big-text" style={{ overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <AnimatedText key={displayText} text={displayText} color={activeColor} />
          </AnimatePresence>
        </div>
      </div>

      <a className="hover-member-scroll-cue" href={scrollTarget} aria-label="Scroll to team contact section">
        <svg className="hover-member-scroll-label" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <path id="scroll-orbit" d="M60,60 m-43,0 a43,43 0 1,1 86,0 a43,43 0 1,1 -86,0" />
          </defs>
          <text>
            <textPath href="#scroll-orbit">SCROLL TO EXPLORE · SCROLL TO EXPLORE · </textPath>
          </text>
        </svg>
        <span aria-hidden="true">↓</span>
      </a>
    </div>
  )
}

