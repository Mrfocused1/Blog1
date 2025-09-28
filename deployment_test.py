#!/usr/bin/env python3
"""
Deployment Debug Script - Testing lbtr.shop and urban-reel.vercel.app
Mission: Identify what's broken after commit a68aa24
"""

import time
import json
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from PIL import Image, ImageDraw, ImageFont

class DeploymentTester:
    def __init__(self):
        self.results = {
            "test_timestamp": datetime.now().isoformat(),
            "domains": {},
            "comparison": {},
            "recommendations": []
        }
        self.setup_driver()

    def setup_driver(self):
        """Initialize Chrome driver with appropriate options"""
        chrome_options = Options()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])

        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 15)

    def log_action(self, action, details=""):
        """Log actions with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {action}")
        if details:
            print(f"    {details}")

    def take_screenshot(self, filename, annotation=None):
        """Take screenshot and optionally annotate"""
        filepath = f"/Users/paulbridges/Downloads/try again/{filename}"
        self.driver.save_screenshot(filepath)

        if annotation:
            # Add annotation to screenshot
            img = Image.open(filepath)
            draw = ImageDraw.Draw(img)
            try:
                # Try to use a larger font
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
            except:
                font = ImageFont.load_default()

            # Add semi-transparent background for text
            text_bbox = draw.textbbox((0, 0), annotation, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height = text_bbox[3] - text_bbox[1]

            # Create overlay
            overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
            overlay_draw = ImageDraw.Draw(overlay)
            overlay_draw.rectangle([10, 10, text_width + 30, text_height + 30],
                                 fill=(0, 0, 0, 180))

            # Composite and add text
            img = Image.alpha_composite(img.convert('RGBA'), overlay)
            draw = ImageDraw.Draw(img)
            draw.text((20, 20), annotation, fill=(255, 255, 255), font=font)

            img.convert('RGB').save(filepath)

        self.log_action(f"Screenshot saved: {filename}", annotation or "")
        return filepath

    def check_console_errors(self):
        """Check for JavaScript console errors"""
        try:
            logs = self.driver.get_log('browser')
            errors = [log for log in logs if log['level'] == 'SEVERE']
            return errors
        except:
            return []

    def test_domain(self, domain_name, url):
        """Test a specific domain comprehensively"""
        self.log_action(f"Testing domain: {domain_name}", url)

        domain_results = {
            "url": url,
            "accessible": False,
            "page_title": None,
            "features": {},
            "console_errors": [],
            "screenshots": [],
            "deployment_info": {}
        }

        try:
            # Navigate to the domain
            self.driver.get(url)
            time.sleep(3)  # Wait for initial load

            # Take initial screenshot
            screenshot = self.take_screenshot(f"{domain_name}_initial.png",
                                            f"{domain_name} - Initial Load")
            domain_results["screenshots"].append(screenshot)

            # Check if page loaded
            domain_results["accessible"] = True
            domain_results["page_title"] = self.driver.title
            self.log_action(f"Page loaded successfully", f"Title: {self.driver.title}")

            # Test 1: Check for Urban Directory title with gradient animation
            self.log_action("Testing Urban Directory title with animated gradient")
            try:
                # Look for the main title
                title_selectors = [
                    "h1",
                    "[class*='gradient']",
                    "[class*='title']",
                    ".bg-gradient-to-r"
                ]

                title_found = False
                for selector in title_selectors:
                    try:
                        elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for element in elements:
                            text = element.text.strip()
                            if "Urban Directory" in text or "Urban" in text:
                                domain_results["features"]["urban_directory_title"] = {
                                    "found": True,
                                    "text": text,
                                    "has_gradient": "gradient" in element.get_attribute("class") or "",
                                    "classes": element.get_attribute("class")
                                }
                                title_found = True
                                self.log_action("✓ Urban Directory title found", f"Text: {text}")
                                break
                        if title_found:
                            break
                    except:
                        continue

                if not title_found:
                    domain_results["features"]["urban_directory_title"] = {"found": False}
                    self.log_action("✗ Urban Directory title not found")

            except Exception as e:
                domain_results["features"]["urban_directory_title"] = {"error": str(e)}

            # Test 2: Check for bold subtitles with font-semibold
            self.log_action("Testing bold subtitles")
            try:
                subtitle_elements = self.driver.find_elements(By.CSS_SELECTOR,
                    ".font-semibold, [class*='font-semibold'], h2, h3")

                subtitles = []
                for element in subtitle_elements:
                    text = element.text.strip()
                    if text and len(text) > 5:  # Skip empty or very short text
                        subtitles.append({
                            "text": text,
                            "classes": element.get_attribute("class"),
                            "tag": element.tag_name
                        })

                domain_results["features"]["bold_subtitles"] = subtitles
                self.log_action(f"✓ Found {len(subtitles)} subtitle elements")

            except Exception as e:
                domain_results["features"]["bold_subtitles"] = {"error": str(e)}

            # Test 3: Check for admin dashboard access
            self.log_action("Testing admin dashboard access")
            try:
                # Look for admin link or button
                admin_selectors = [
                    "a[href*='admin']",
                    "button[class*='admin']",
                    "[data-testid='admin']",
                    "a:contains('Admin')",
                    "button:contains('Admin')"
                ]

                admin_found = False
                for selector in admin_selectors:
                    try:
                        if ":contains(" in selector:
                            # Use XPath for text content
                            xpath = f"//*[contains(text(), 'Admin')]"
                            elements = self.driver.find_elements(By.XPATH, xpath)
                        else:
                            elements = self.driver.find_elements(By.CSS_SELECTOR, selector)

                        if elements:
                            admin_element = elements[0]
                            domain_results["features"]["admin_access"] = {
                                "found": True,
                                "element_type": admin_element.tag_name,
                                "text": admin_element.text,
                                "href": admin_element.get_attribute("href") if admin_element.tag_name == "a" else None
                            }
                            admin_found = True
                            self.log_action("✓ Admin access found")

                            # Try to access admin page
                            if admin_element.tag_name == "a":
                                href = admin_element.get_attribute("href")
                                if href:
                                    self.log_action("Navigating to admin page")
                                    self.driver.get(href)
                                    time.sleep(2)

                                    # Take admin page screenshot
                                    admin_screenshot = self.take_screenshot(f"{domain_name}_admin.png",
                                                                          f"{domain_name} - Admin Page")
                                    domain_results["screenshots"].append(admin_screenshot)

                                    # Check for admin subtitle
                                    try:
                                        admin_subtitle = self.driver.find_element(By.XPATH,
                                            "//*[contains(text(), 'Manage your video directory')]")
                                        domain_results["features"]["admin_subtitle"] = {
                                            "found": True,
                                            "text": admin_subtitle.text
                                        }
                                        self.log_action("✓ Admin subtitle found", admin_subtitle.text)
                                    except:
                                        domain_results["features"]["admin_subtitle"] = {"found": False}
                                        self.log_action("✗ Admin subtitle not found")

                            break
                    except:
                        continue

                if not admin_found:
                    domain_results["features"]["admin_access"] = {"found": False}
                    self.log_action("✗ Admin access not found")

            except Exception as e:
                domain_results["features"]["admin_access"] = {"error": str(e)}

            # Test 4: Check for modern checkbox UI (if on admin page)
            if "admin" in self.driver.current_url.lower():
                self.log_action("Testing modern checkbox UI in admin")
                try:
                    # Look for add/edit buttons
                    add_buttons = self.driver.find_elements(By.XPATH,
                        "//*[contains(text(), 'Add') or contains(text(), 'Edit')]")

                    if add_buttons:
                        add_button = add_buttons[0]
                        self.driver.execute_script("arguments[0].click();", add_button)
                        time.sleep(2)

                        # Look for modal or form
                        modal_selectors = [
                            ".modal",
                            "[role='dialog']",
                            ".fixed",
                            ".z-50"
                        ]

                        modal_found = False
                        for selector in modal_selectors:
                            try:
                                modal = self.driver.find_element(By.CSS_SELECTOR, selector)
                                if modal.is_displayed():
                                    modal_found = True

                                    # Take modal screenshot
                                    modal_screenshot = self.take_screenshot(f"{domain_name}_modal.png",
                                                                          f"{domain_name} - Modal/Form")
                                    domain_results["screenshots"].append(modal_screenshot)

                                    # Check for modern checkboxes
                                    checkboxes = modal.find_elements(By.CSS_SELECTOR,
                                        "input[type='checkbox'], [role='checkbox']")

                                    checkbox_features = []
                                    for checkbox in checkboxes:
                                        parent = checkbox.find_element(By.XPATH, "..")
                                        checkbox_features.append({
                                            "classes": checkbox.get_attribute("class"),
                                            "parent_classes": parent.get_attribute("class"),
                                            "has_glassmorphism": "backdrop" in parent.get_attribute("class") or ""
                                        })

                                    domain_results["features"]["modern_checkboxes"] = {
                                        "found": len(checkboxes) > 0,
                                        "count": len(checkboxes),
                                        "features": checkbox_features
                                    }

                                    self.log_action(f"✓ Found {len(checkboxes)} checkboxes")
                                    break
                            except:
                                continue

                        if not modal_found:
                            domain_results["features"]["modern_checkboxes"] = {"modal_not_found": True}

                except Exception as e:
                    domain_results["features"]["modern_checkboxes"] = {"error": str(e)}

            # Test 5: Check Firebase integration
            self.log_action("Testing Firebase integration")
            try:
                # Check for Firebase in page source or network requests
                page_source = self.driver.page_source.lower()

                firebase_indicators = [
                    "firebase" in page_source,
                    "firestore" in page_source,
                    "googleapis.com" in page_source
                ]

                domain_results["features"]["firebase_integration"] = {
                    "firebase_in_source": firebase_indicators[0],
                    "firestore_in_source": firebase_indicators[1],
                    "googleapis_in_source": firebase_indicators[2],
                    "likely_integrated": any(firebase_indicators)
                }

                self.log_action(f"✓ Firebase integration check complete",
                              f"Likely integrated: {any(firebase_indicators)}")

            except Exception as e:
                domain_results["features"]["firebase_integration"] = {"error": str(e)}

            # Check for deployment information
            self.log_action("Checking deployment information")
            try:
                # Look for version info, build timestamps, etc.
                meta_tags = self.driver.find_elements(By.TAG_NAME, "meta")
                deployment_info = {}

                for meta in meta_tags:
                    name = meta.get_attribute("name")
                    content = meta.get_attribute("content")
                    if name and content:
                        if any(keyword in name.lower() for keyword in ["version", "build", "deploy"]):
                            deployment_info[name] = content

                domain_results["deployment_info"] = deployment_info

                # Check for Vercel deployment indicators
                if "vercel" in url:
                    try:
                        # Look for Vercel headers or indicators
                        vercel_response = self.driver.execute_script("""
                            return fetch(window.location.href)
                                .then(response => ({
                                    headers: Object.fromEntries([...response.headers.entries()]),
                                    status: response.status
                                }));
                        """)
                        domain_results["deployment_info"]["vercel_headers"] = vercel_response
                    except:
                        pass

            except Exception as e:
                domain_results["deployment_info"]["error"] = str(e)

            # Check console errors
            domain_results["console_errors"] = self.check_console_errors()

            # Take final screenshot
            final_screenshot = self.take_screenshot(f"{domain_name}_final.png",
                                                   f"{domain_name} - Final State")
            domain_results["screenshots"].append(final_screenshot)

        except Exception as e:
            domain_results["error"] = str(e)
            self.log_action(f"✗ Error testing {domain_name}", str(e))

            # Take error screenshot
            try:
                error_screenshot = self.take_screenshot(f"{domain_name}_error.png",
                                                       f"{domain_name} - Error State")
                domain_results["screenshots"].append(error_screenshot)
            except:
                pass

        return domain_results

    def compare_domains(self):
        """Compare both domains and identify differences"""
        lbtr = self.results["domains"].get("lbtr.shop", {})
        vercel = self.results["domains"].get("urban-reel.vercel.app", {})

        comparison = {
            "both_accessible": lbtr.get("accessible", False) and vercel.get("accessible", False),
            "title_comparison": {
                "lbtr": lbtr.get("page_title"),
                "vercel": vercel.get("page_title"),
                "same": lbtr.get("page_title") == vercel.get("page_title")
            },
            "feature_comparison": {}
        }

        # Compare each feature
        features = ["urban_directory_title", "bold_subtitles", "admin_access", "admin_subtitle",
                   "modern_checkboxes", "firebase_integration"]

        for feature in features:
            lbtr_feature = lbtr.get("features", {}).get(feature, {})
            vercel_feature = vercel.get("features", {}).get(feature, {})

            comparison["feature_comparison"][feature] = {
                "lbtr": lbtr_feature,
                "vercel": vercel_feature,
                "same": lbtr_feature == vercel_feature
            }

        return comparison

    def generate_recommendations(self):
        """Generate specific recommendations based on test results"""
        recommendations = []

        lbtr = self.results["domains"].get("lbtr.shop", {})
        vercel = self.results["domains"].get("urban-reel.vercel.app", {})

        # Check accessibility
        if not lbtr.get("accessible", False):
            recommendations.append({
                "priority": "HIGH",
                "issue": "lbtr.shop is not accessible",
                "solution": "Check DNS configuration and deployment status"
            })

        if not vercel.get("accessible", False):
            recommendations.append({
                "priority": "HIGH",
                "issue": "urban-reel.vercel.app is not accessible",
                "solution": "Check Vercel deployment status and build logs"
            })

        # Check for missing features
        for domain_name, domain_data in [("lbtr.shop", lbtr), ("urban-reel.vercel.app", vercel)]:
            if not domain_data.get("accessible", False):
                continue

            features = domain_data.get("features", {})

            # Check Urban Directory title
            if not features.get("urban_directory_title", {}).get("found", False):
                recommendations.append({
                    "priority": "HIGH",
                    "issue": f"{domain_name}: Urban Directory title not found or lacks gradient animation",
                    "solution": "Verify gradient CSS classes and title component is properly deployed"
                })

            # Check admin access
            if not features.get("admin_access", {}).get("found", False):
                recommendations.append({
                    "priority": "MEDIUM",
                    "issue": f"{domain_name}: Admin access not found",
                    "solution": "Check if admin routes are properly configured and navigation exists"
                })

            # Check modern checkboxes
            checkbox_data = features.get("modern_checkboxes", {})
            if "error" in checkbox_data or not checkbox_data.get("found", False):
                recommendations.append({
                    "priority": "MEDIUM",
                    "issue": f"{domain_name}: Modern checkbox UI not found or not working",
                    "solution": "Verify checkbox components and glassmorphism styling are deployed"
                })

            # Check Firebase integration
            firebase_data = features.get("firebase_integration", {})
            if not firebase_data.get("likely_integrated", False):
                recommendations.append({
                    "priority": "HIGH",
                    "issue": f"{domain_name}: Firebase integration not detected",
                    "solution": "Check Firebase configuration and ensure proper deployment of Firebase SDK"
                })

            # Check for console errors
            errors = domain_data.get("console_errors", [])
            if errors:
                recommendations.append({
                    "priority": "HIGH",
                    "issue": f"{domain_name}: {len(errors)} console errors detected",
                    "solution": f"Review and fix JavaScript errors: {[e['message'][:50] for e in errors[:3]]}"
                })

        # Final recommendation based on overall state
        if len(recommendations) > 0:
            recommendations.append({
                "priority": "ACTION",
                "issue": "Multiple issues detected with current deployment",
                "solution": "Consider reverting to commit a68aa24 'Add modern checkbox UI for category selection in admin panels' which was the last known working deployment"
            })

        return recommendations

    def run_tests(self):
        """Run comprehensive tests on both domains"""
        self.log_action("Starting comprehensive deployment testing")

        # Test both domains
        domains = {
            "lbtr.shop": "https://lbtr.shop",
            "urban-reel.vercel.app": "https://urban-reel.vercel.app"
        }

        for domain_name, url in domains.items():
            self.results["domains"][domain_name] = self.test_domain(domain_name, url)
            time.sleep(2)  # Brief pause between domain tests

        # Compare domains
        self.results["comparison"] = self.compare_domains()

        # Generate recommendations
        self.results["recommendations"] = self.generate_recommendations()

        # Save results
        with open("/Users/paulbridges/Downloads/try again/deployment_test_results.json", "w") as f:
            json.dump(self.results, f, indent=2)

        self.log_action("Testing completed", "Results saved to deployment_test_results.json")

    def cleanup(self):
        """Clean up resources"""
        if hasattr(self, 'driver'):
            self.driver.quit()

if __name__ == "__main__":
    tester = DeploymentTester()
    try:
        tester.run_tests()
    finally:
        tester.cleanup()