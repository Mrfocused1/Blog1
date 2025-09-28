#!/usr/bin/env python3
"""
Gradient Animation Analysis Script
Focus on checking for the specific features from commit a68aa24
"""

import time
import json
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

class GradientAnalyzer:
    def __init__(self):
        self.setup_driver()
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "domains": {}
        }

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

    def analyze_gradient(self, domain_name, url):
        """Deep analysis of gradient implementation"""
        print(f"\n🔍 Analyzing {domain_name} for gradient features...")

        domain_results = {
            "url": url,
            "title_gradient": {},
            "css_analysis": {},
            "computed_styles": {},
            "background_analysis": {}
        }

        try:
            self.driver.get(url)
            time.sleep(3)

            # Find the Urban Directory title
            title_element = None
            title_selectors = [
                "h1",
                "[class*='text-3xl']",
                "[class*='text-4xl']",
                "[class*='text-6xl']",
                "*:contains('Urban Directory')"
            ]

            for selector in title_selectors:
                try:
                    if ":contains(" in selector:
                        elements = self.driver.find_elements(By.XPATH,
                            "//*[contains(text(), 'Urban Directory')]")
                    else:
                        elements = self.driver.find_elements(By.CSS_SELECTOR, selector)

                    if elements:
                        for element in elements:
                            if "Urban Directory" in element.text:
                                title_element = element
                                break
                        if title_element:
                            break
                except:
                    continue

            if title_element:
                print("✓ Found Urban Directory title element")

                # Get all CSS classes
                classes = title_element.get_attribute("class") or ""
                domain_results["title_gradient"]["classes"] = classes

                # Check for gradient-related classes
                gradient_classes = [cls for cls in classes.split() if 'gradient' in cls.lower()]
                domain_results["title_gradient"]["gradient_classes"] = gradient_classes

                # Get computed styles
                computed_styles = {}
                style_properties = [
                    'background', 'background-image', 'background-clip', 'color',
                    'background-color', '-webkit-background-clip', '-webkit-text-fill-color',
                    'animation', 'animation-name', 'animation-duration', 'text-decoration'
                ]

                for prop in style_properties:
                    try:
                        value = self.driver.execute_script(
                            f"return getComputedStyle(arguments[0]).getPropertyValue('{prop}');",
                            title_element
                        )
                        if value and value != 'none' and value.strip():
                            computed_styles[prop] = value
                    except:
                        pass

                domain_results["computed_styles"] = computed_styles

                # Check for purple/lavender colors specifically
                purple_keywords = ['purple', 'lavender', 'violet', '#8B5CF6', '#A855F7', '#C084FC']
                has_purple = False
                for prop, value in computed_styles.items():
                    for keyword in purple_keywords:
                        if keyword.lower() in value.lower():
                            has_purple = True
                            break

                domain_results["title_gradient"]["has_purple_colors"] = has_purple

                # Check if text has gradient background
                bg_image = computed_styles.get('background-image', '')
                bg_clip = computed_styles.get('background-clip', '')
                webkit_bg_clip = computed_styles.get('-webkit-background-clip', '')
                webkit_text_fill = computed_styles.get('-webkit-text-fill-color', '')

                is_text_gradient = (
                    'linear-gradient' in bg_image or
                    'gradient' in bg_image or
                    bg_clip == 'text' or
                    webkit_bg_clip == 'text' or
                    webkit_text_fill == 'transparent'
                )

                domain_results["title_gradient"]["is_text_gradient"] = is_text_gradient
                domain_results["title_gradient"]["has_animation"] = (
                    computed_styles.get('animation', 'none') != 'none' or
                    computed_styles.get('animation-name', 'none') != 'none'
                )

                print(f"   Classes: {classes}")
                print(f"   Gradient classes: {gradient_classes}")
                print(f"   Is text gradient: {is_text_gradient}")
                print(f"   Has purple colors: {has_purple}")
                print(f"   Has animation: {domain_results['title_gradient']['has_animation']}")

            else:
                print("✗ Urban Directory title element not found")
                domain_results["title_gradient"]["found"] = False

            # Check page CSS for gradient definitions
            print("🎨 Checking page CSS for gradient definitions...")

            css_content = self.driver.execute_script("""
                let css = '';
                for (let i = 0; i < document.styleSheets.length; i++) {
                    try {
                        let sheet = document.styleSheets[i];
                        if (sheet.cssRules) {
                            for (let j = 0; j < sheet.cssRules.length; j++) {
                                css += sheet.cssRules[j].cssText + '\\n';
                            }
                        }
                    } catch (e) {
                        // Cross-origin stylesheets may not be accessible
                    }
                }
                return css;
            """)

            gradient_definitions = []
            for line in css_content.split('\n'):
                if 'gradient' in line.lower() and ('purple' in line.lower() or 'lavender' in line.lower() or '#8B5CF6' in line or '#A855F7' in line):
                    gradient_definitions.append(line.strip())

            domain_results["css_analysis"]["gradient_definitions"] = gradient_definitions
            print(f"   Found {len(gradient_definitions)} gradient definitions with purple/lavender")

            # Check for TSParticles (animated background)
            print("✨ Checking for TSParticles animation...")

            tsparticles_elements = self.driver.find_elements(By.CSS_SELECTOR,
                "[id*='tsparticles'], [class*='tsparticles'], canvas")

            domain_results["background_analysis"]["tsparticles_found"] = len(tsparticles_elements) > 0
            domain_results["background_analysis"]["canvas_count"] = len([e for e in tsparticles_elements if e.tag_name == 'canvas'])

            if tsparticles_elements:
                print(f"   ✓ Found {len(tsparticles_elements)} animation elements")
                print(f"   ✓ Found {domain_results['background_analysis']['canvas_count']} canvas elements")
            else:
                print("   ✗ No TSParticles animation found")

        except Exception as e:
            domain_results["error"] = str(e)
            print(f"✗ Error analyzing {domain_name}: {str(e)}")

        return domain_results

    def analyze_both_domains(self):
        """Analyze both domains for gradient features"""
        domains = {
            "lbtr.shop": "https://lbtr.shop",
            "urban-reel.vercel.app": "https://urban-reel.vercel.app"
        }

        for domain_name, url in domains.items():
            self.results["domains"][domain_name] = self.analyze_gradient(domain_name, url)
            time.sleep(2)

    def generate_report(self):
        """Generate detailed analysis report"""
        print("\n" + "="*80)
        print("🎨 GRADIENT ANIMATION ANALYSIS REPORT")
        print("="*80)

        for domain_name, data in self.results["domains"].items():
            print(f"\n📍 {domain_name.upper()}")
            print("-" * 50)

            if "error" in data:
                print(f"❌ Error: {data['error']}")
                continue

            title_grad = data.get("title_gradient", {})
            css_analysis = data.get("css_analysis", {})
            bg_analysis = data.get("background_analysis", {})
            computed = data.get("computed_styles", {})

            print(f"🎯 Title Gradient Analysis:")
            print(f"   • Classes: {title_grad.get('classes', 'N/A')}")
            print(f"   • Gradient classes: {title_grad.get('gradient_classes', [])}")
            print(f"   • Is text gradient: {title_grad.get('is_text_gradient', False)}")
            print(f"   • Has purple colors: {title_grad.get('has_purple_colors', False)}")
            print(f"   • Has animation: {title_grad.get('has_animation', False)}")

            print(f"\n🎨 CSS Analysis:")
            print(f"   • Purple gradient definitions: {len(css_analysis.get('gradient_definitions', []))}")
            if css_analysis.get('gradient_definitions'):
                for grad_def in css_analysis['gradient_definitions'][:3]:  # Show first 3
                    print(f"     - {grad_def[:80]}...")

            print(f"\n✨ Background Animation:")
            print(f"   • TSParticles found: {bg_analysis.get('tsparticles_found', False)}")
            print(f"   • Canvas elements: {bg_analysis.get('canvas_count', 0)}")

            print(f"\n🔧 Key Computed Styles:")
            for prop, value in computed.items():
                if any(keyword in prop for keyword in ['background', 'color', 'animation']):
                    print(f"   • {prop}: {value}")

        # Comparison
        lbtr_data = self.results["domains"].get("lbtr.shop", {})
        vercel_data = self.results["domains"].get("urban-reel.vercel.app", {})

        print(f"\n🔄 COMPARISON")
        print("-" * 50)

        features_to_compare = [
            ("Title gradient", "title_gradient.is_text_gradient"),
            ("Purple colors", "title_gradient.has_purple_colors"),
            ("Animation", "title_gradient.has_animation"),
            ("TSParticles", "background_analysis.tsparticles_found")
        ]

        for feature_name, feature_path in features_to_compare:
            lbtr_val = self.get_nested_value(lbtr_data, feature_path)
            vercel_val = self.get_nested_value(vercel_data, feature_path)

            status = "✓ Same" if lbtr_val == vercel_val else "⚠️  Different"
            print(f"{feature_name:20} | lbtr: {lbtr_val:8} | vercel: {vercel_val:8} | {status}")

        # Final recommendation
        print(f"\n🎯 FINAL ASSESSMENT")
        print("-" * 50)

        both_have_gradient = (
            self.get_nested_value(lbtr_data, "title_gradient.is_text_gradient") and
            self.get_nested_value(vercel_data, "title_gradient.is_text_gradient")
        )

        both_have_purple = (
            self.get_nested_value(lbtr_data, "title_gradient.has_purple_colors") and
            self.get_nested_value(vercel_data, "title_gradient.has_purple_colors")
        )

        both_have_animation = (
            self.get_nested_value(lbtr_data, "title_gradient.has_animation") and
            self.get_nested_value(vercel_data, "title_gradient.has_animation")
        )

        both_have_particles = (
            self.get_nested_value(lbtr_data, "background_analysis.tsparticles_found") and
            self.get_nested_value(vercel_data, "background_analysis.tsparticles_found")
        )

        if both_have_gradient and both_have_purple and both_have_particles:
            print("✅ GOOD: Both domains appear to be working correctly with expected features")
            print("   The issue might not be with the current deployment")
        elif not both_have_gradient:
            print("❌ ISSUE: Gradient animation is missing or not properly implemented")
            print("   Expected: Purple gradient text animation on 'Urban Directory' title")
        elif not both_have_purple:
            print("❌ ISSUE: Purple color scheme is missing")
            print("   Expected: Purple/lavender gradient colors")
        elif not both_have_particles:
            print("❌ ISSUE: Background particles animation is missing")
            print("   Expected: TSParticles background animation")
        else:
            print("⚠️  PARTIAL: Some features are present but others may be missing")

        # Save detailed results
        with open("/Users/paulbridges/Downloads/try again/gradient_analysis_results.json", "w") as f:
            json.dump(self.results, f, indent=2)

    def get_nested_value(self, data, path):
        """Get nested dictionary value using dot notation"""
        try:
            keys = path.split('.')
            value = data
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return False

    def cleanup(self):
        """Clean up resources"""
        if hasattr(self, 'driver'):
            self.driver.quit()

if __name__ == "__main__":
    analyzer = GradientAnalyzer()
    try:
        analyzer.analyze_both_domains()
        analyzer.generate_report()
    finally:
        analyzer.cleanup()