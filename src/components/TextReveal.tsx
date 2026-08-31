import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getDeviceProfile } from '../lib/device'

gsap.registerPlugin(ScrollTrigger)

export type AnimationMode = 'popup' | 'blur' | 'reveal' | 'skew' | 'bounce'

interface TextPopProps {
  children?: React.ReactNode
  text?: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div'
  className?: string
  delay?: number
  stagger?: number
  mode?: AnimationMode
}

function processChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child, index) => {
    if (typeof child === 'string') {
      return child.split(' ').map((word, i) => (
        <span key={`${index}-${i}`} className="pop-word-box">
          <span className="pop-word">{word}&nbsp;</span>
        </span>
      ))
    }
    if (React.isValidElement(child)) {
      const props = child.props as { children?: React.ReactNode }
      if (props && props.children) {
        return React.cloneElement(child as React.ReactElement<{ children?: React.ReactNode }>, {
          children: processChildren(props.children),
        })
      }
    }
    return child
  })
}

export function TextPop({
  children,
  text,
  as = 'div',
  className = '',
  delay = 0,
  stagger = 0.035,
  mode = 'popup',
}: TextPopProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const targets = el.querySelectorAll('.pop-word')
    if (!targets.length) return

    // Reduced-motion users get plain, always-visible text — no from-states,
    // no triggers, nothing that could leave words stranded invisible.
    if (getDeviceProfile().reducedMotion) return

    const ctx = gsap.context(() => {
      switch (mode) {
        case 'blur':
          gsap.fromTo(
            targets,
            {
              y: 26,
              opacity: 0,
              filter: 'blur(12px)',
              force3D: true,
            },
            {
              y: 0,
              opacity: 1,
              filter: 'blur(0px)',
              duration: 0.8,
              delay,
              stagger,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                toggleActions: 'play none none none',
              },
            }
          )
          break

        case 'reveal':
          gsap.fromTo(
            targets,
            {
              yPercent: 110,
              opacity: 0,
              force3D: true,
            },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.85,
              delay,
              stagger,
              ease: 'power4.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                toggleActions: 'play none none none',
              },
            }
          )
          break

        case 'skew':
          gsap.fromTo(
            targets,
            {
              y: 45,
              skewY: 6,
              opacity: 0,
              force3D: true,
            },
            {
              y: 0,
              skewY: 0,
              opacity: 1,
              duration: 0.75,
              delay,
              stagger,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                toggleActions: 'play none none none',
              },
            }
          )
          break

        case 'bounce':
          gsap.fromTo(
            targets,
            {
              y: 50,
              scale: 0.65,
              opacity: 0,
              force3D: true,
            },
            {
              y: 0,
              scale: 1,
              opacity: 1,
              duration: 0.9,
              delay,
              stagger: stagger * 1.2,
              ease: 'back.out(2.2)',
              scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                toggleActions: 'play none none none',
              },
            }
          )
          break

        case 'popup':
        default:
          gsap.fromTo(
            targets,
            {
              y: 38,
              opacity: 0,
              scale: 0.9,
              rotationX: -15,
              transformOrigin: '0% 50% -20px',
              force3D: true,
            },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              rotationX: 0,
              duration: 0.75,
              delay,
              stagger,
              ease: 'back.out(1.6)',
              scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                toggleActions: 'play none none none',
              },
            }
          )
          break
      }
    }, el)

    return () => ctx.revert()
  }, [delay, stagger, mode, text, children])

  const contentToRender = text
    ? text.split(' ').map((word, i) => (
        <span key={i} className="pop-word-box">
          <span className="pop-word">{word}&nbsp;</span>
        </span>
      ))
    : processChildren(children)

  return React.createElement(
    as,
    {
      ref: containerRef,
      className: `pop-text-wrap pop-mode-${mode} ${className}`,
    },
    contentToRender
  )
}
