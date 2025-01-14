/**
 * @fileoverview Footer Component
 * Implements Material Design 3.0 principles with WCAG 2.1 Level AA compliance
 * Features responsive layout, theme transitions, and keyboard navigation
 * @version 1.0.0
 */

import React, { useCallback } from 'react'; // ^18.0.0
import styled from '@emotion/styled'; // ^11.0.0
import { useTranslation } from 'react-i18next'; // ^12.0.0
import { Button } from '../common/Button';
import { APP_NAME } from '../../constants/app.constants';
import { useTheme } from '../../hooks/useTheme';
import { BREAKPOINTS, SPACING, TRANSITIONS, TYPOGRAPHY } from '../../constants/theme.constants';

// Footer links with ARIA labels for accessibility
const FOOTER_LINKS = [
  { label: 'About', href: '/about', ariaLabel: 'About us page' },
  { label: 'Terms', href: '/terms', ariaLabel: 'Terms of service' },
  { label: 'Privacy', href: '/privacy', ariaLabel: 'Privacy policy' },
  { label: 'Contact', href: '/contact', ariaLabel: 'Contact us' }
] as const;

// Styled components with theme support and responsive design
const FooterContainer = styled.footer`
  position: relative;
  width: 100%;
  background-color: ${({ theme }) => theme.palette.background.paper};
  border-top: 1px solid ${({ theme }) => theme.palette.divider};
  padding: ${SPACING.scale[4]} ${SPACING.scale[3]};
  transition: all ${TRANSITIONS.duration.shorter} ${TRANSITIONS.easing.easeInOut};
  z-index: ${({ theme }) => theme.zIndex.appBar - 1};

  @media print {
    display: none;
  }
`;

const FooterContent = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${SPACING.scale[3]};
  max-width: ${BREAKPOINTS.values.lg}px;
  margin: 0 auto;
  align-items: center;
  text-align: center;

  ${BREAKPOINTS.up('sm')} {
    grid-template-columns: 1fr auto;
    text-align: left;
  }
`;

const FooterLinks = styled.nav`
  display: flex;
  gap: ${SPACING.scale[2]};
  flex-wrap: wrap;
  justify-content: center;

  ${BREAKPOINTS.up('sm')} {
    justify-content: flex-end;
  }

  /* Focus visible styles for keyboard navigation */
  a:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 2px;
  }
`;

const Copyright = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.palette.text.secondary};
  font-family: ${TYPOGRAPHY.fontFamilies.primary};
  font-size: ${TYPOGRAPHY.fontSizes.sm};
  line-height: ${TYPOGRAPHY.lineHeights.normal};
`;

/**
 * Footer component with responsive layout and accessibility features
 * Implements WCAG 2.1 Level AA compliance
 */
const Footer = React.memo(() => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const currentYear = new Date().getFullYear();

  // Memoized link click handler with keyboard support
  const handleLinkClick = useCallback((href: string) => (
    event: React.KeyboardEvent | React.MouseEvent
  ) => {
    // Handle both click and keyboard events
    if (
      event.type === 'click' ||
      (event as React.KeyboardEvent).key === 'Enter'
    ) {
      window.location.href = href;
    }
  }, []);

  return (
    <FooterContainer role="contentinfo" theme={theme}>
      <FooterContent>
        <Copyright>
          © {currentYear} {APP_NAME}. {t('footer.allRightsReserved')}
        </Copyright>
        
        <FooterLinks aria-label={t('footer.navigation')}>
          {FOOTER_LINKS.map(({ label, href, ariaLabel }) => (
            <Button
              key={href}
              variant="TEXT"
              size="SMALL"
              onClick={handleLinkClick(href)}
              ariaLabel={ariaLabel}
              tabIndex={0}
              role="link"
              onKeyPress={handleLinkClick(href)}
            >
              {t(`footer.links.${label.toLowerCase()}`)}
            </Button>
          ))}
        </FooterLinks>
      </FooterContent>
    </FooterContainer>
  );
});

Footer.displayName = 'Footer';

export default Footer;