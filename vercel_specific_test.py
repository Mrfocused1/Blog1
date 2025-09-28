#!/usr/bin/env python3
"""
Vercel Specific Test - Handle alert and analyze the difference
"""

import time
import json
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException, UnexpectedAlertPresentException

class VercelSpecificTester:
    def __init__(self):
        self.setup_driver()

    def setup_driver(self):
        """Initialize Chrome driver"""
        chrome_options = Options()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])

        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 15)

    def test_vercel_with_alert_handling(self):
        """Test Vercel domain with proper alert handling"""
        print("🚀 Testing urban-reel.vercel.app with alert handling...")

        try:
            self.driver.get("https://urban-reel.vercel.app")
            time.sleep(2)

            # Handle any alerts that popup
            try:
                alert = self.driver.switch_to.alert
                alert_text = alert.text
                print(f"⚠️  Alert detected: {alert_text}")
                alert.accept()  # Accept the alert
                print("✓ Alert dismissed")
                time.sleep(1)
            except:
                print("✓ No alert detected")

            # Now proceed with analysis
            print("🔍 Analyzing page after alert handling...")

            # Check for gradient on title
            title_elements = self.driver.find_elements(By.XPATH,
                "//*[contains(text(), 'Urban Directory')]")

            if title_elements:
                title_element = title_elements[0]
                classes = title_element.get_attribute("class") or ""
                print(f"Title classes: {classes}")

                # Check for gradient classes specifically
                gradient_indicators = [
                    'bg-gradient-to-r',
                    'from-neon-purple',
                    'via-neon-lavender',
                    'to-neon-purple',
                    'bg-clip-text',
                    'text-transparent'
                ]

                found_gradient_classes = [cls for cls in gradient_indicators if cls in classes]
                print(f"Gradient classes found: {found_gradient_classes}")

                # Get computed styles for the title
                computed_styles = {}
                style_properties = [
                    'background-image', 'background-clip', '-webkit-background-clip',
                    '-webkit-text-fill-color', 'color', 'background'
                ]

                for prop in style_properties:
                    try:
                        value = self.driver.execute_script(
                            f"return getComputedStyle(arguments[0]).getPropertyValue('{prop}');",
                            title_element
                        )
                        computed_styles[prop] = value
                    except Exception as e:
                        print(f"Error getting {prop}: {e}")

                print("Computed styles:")
                for prop, value in computed_styles.items():
                    print(f"  {prop}: {value}")

                # Check if the gradient is actually applied
                bg_image = computed_styles.get('background-image', '')
                bg_clip = computed_styles.get('background-clip', '')
                webkit_bg_clip = computed_styles.get('-webkit-background-clip', '')

                has_gradient = 'linear-gradient' in bg_image
                has_text_clip = bg_clip == 'text' or webkit_bg_clip == 'text'

                print(f"\nGradient Analysis:")
                print(f"  Has linear gradient: {has_gradient}")
                print(f"  Has text clipping: {has_text_clip}")
                print(f"  Should be gradient text: {has_gradient and has_text_clip}")

            else:
                print("❌ Urban Directory title not found")

            # Check page source for gradient CSS
            print("\n🎨 Checking if gradient CSS is in page source...")
            page_source = self.driver.page_source

            gradient_checks = [
                'bg-gradient-to-r',
                'from-neon-purple',
                'via-neon-lavender',
                'to-neon-purple',
                'bg-clip-text',
                'text-transparent'
            ]

            for check in gradient_checks:
                if check in page_source:
                    print(f"  ✓ Found '{check}' in page source")
                else:
                    print(f"  ✗ Missing '{check}' in page source")

            # Check for TSParticles
            print("\n✨ Checking for TSParticles...")
            canvas_elements = self.driver.find_elements(By.TAG_NAME, "canvas")
            tsparticles_divs = self.driver.find_elements(By.CSS_SELECTOR, "[id*='tsparticles']")

            print(f"  Canvas elements: {len(canvas_elements)}")
            print(f"  TSParticles divs: {len(tsparticles_divs)}")

            if canvas_elements:
                print("  ✓ Animation canvas found")
            else:
                print("  ✗ No animation canvas found")

            # Take a screenshot for visual confirmation
            self.driver.save_screenshot("/Users/paulbridges/Downloads/try again/vercel_analysis.png")
            print("📸 Screenshot saved as vercel_analysis.png")

            # Check console errors
            print("\n📋 Checking console errors...")
            try:
                logs = self.driver.get_log('browser')
                errors = [log for log in logs if log['level'] == 'SEVERE']
                print(f"  Console errors: {len(errors)}")
                for error in errors[:3]:  # Show first 3
                    print(f"    - {error['message'][:100]}...")
            except Exception as e:
                print(f"  Could not get console logs: {e}")

        except Exception as e:
            print(f"❌ Error during Vercel analysis: {str(e)}")

    def cleanup(self):
        """Clean up resources"""
        if hasattr(self, 'driver'):
            self.driver.quit()

if __name__ == "__main__":
    tester = VercelSpecificTester()
    try:
        tester.test_vercel_with_alert_handling()
    finally:
        tester.cleanup()