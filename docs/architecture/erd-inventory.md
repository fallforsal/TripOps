# ERD inventory từ XML mới

Ngày đối chiếu: 2026-10-21. Nguồn duy nhất cho schema gốc: `docs/source/ERD.drawio.xml`, trang `Database`. Đây là bản trích nguyên trạng, không phải schema đã duyệt.

Kết quả: **27 bảng, 330 dòng cột, 329 cặp bảng/cột phân biệt, 29 đường nối**. `tours.visibility` lặp hai dòng. Khoảng trắng/NBSP ở đầu/cuối nhãn được trim để đọc; tên, thứ tự và cell ID được giữ. Không đổi `baseprice`, `diemnoibat`, `duration_tour` hoặc tên bảng số ít thành tên chuẩn khác.

XML đánh dấu `PK` ở `id` của cả 27 bảng. Các ô dấu còn lại rỗng: không có nhãn FK, kiểu SQL, NULL, UNIQUE, index hay tập giá trị enum. Không suy ra những thuộc tính này từ hình dạng hoặc tên cột. Các đề xuất nằm trong [schema-proposal.md](schema-proposal.md).

## Danh sách bảng

| Bảng | Dòng cột | Table cell ID |
|---|---:|---|
| `users` | 11 | `CJYxWaz2PEXsALEdqlrQ-0` |
| `business_profiles` | 12 | `CJYxWaz2PEXsALEdqlrQ-34` |
| `services` | 24 | `CJYxWaz2PEXsALEdqlrQ-71` |
| `tour_custom_requests` | 16 | `IolQLlJez9LnykiPAneI-0` |
| `tour_custom_request_agencies` | 10 | `IolQLlJez9LnykiPAneI-46` |
| `tours` | 30 | `nT-pTPnVr-UvncDkvP_g-0` |
| `tour_pricing_tiers` | 8 | `IWlLsS_bMDUl_yZlNZCF-0` |
| `tour_timeline` | 5 | `IWlLsS_bMDUl_yZlNZCF-25` |
| `tourist_attractions` | 4 | `IWlLsS_bMDUl_yZlNZCF-41` |
| `tour_meals` | 10 | `iVWCHMw1oBkdcXWiyxXV-0` |
| `tour_accommodations` | 12 | `nDmuiOsB0o0tNeiBgKZg-0` |
| `tour_versions` | 8 | `A6IPY3i-jTjWFG4SZj7q-25` |
| `bookings` | 19 | `HEe_iAG-CRYb-oDf0PpP-0` |
| `booking_agencies` | 13 | `I2L0zsXnWkuPudD3Rc1s-0` |
| `booking_assigned_guides` | 7 | `s7awg47pFv2taVHxR5dV-0` |
| `booking_participants` | 21 | `QCptvn9GrJm7jptMbFHz-0` |
| `booking_timelines` | 6 | `HTmh5X-JGo4QGTcfSQfJ-0` |
| `booking_timeline_attractions` | 11 | `HTmh5X-JGo4QGTcfSQfJ-19` |
| `booking_timeline_meals` | 10 | `Bqe4v-GgHtqsdSj7iR87-0` |
| `booking_accommodations` | 13 | `4lJ9q3R-2pdJ9qNqJ2PT-0` |
| `payment_transactions` | 10 | `btViULTvZb2oLbnIi7mX-0` |
| `booking_price_adjustments` | 9 | `uj6FksDJq3zV4mt5sn0H-0` |
| `feedbacks` | 14 | `E7ltDoCkuKSttiEcwemx-0` |
| `complaints` | 16 | `E7ltDoCkuKSttiEcwemx-43` |
| `payment_requests` | 9 | `horShYxWzOGdj-Vwt23i-0` |
| `booking_attraction_checkins` | 10 | `F2joBvbATli_mSEXEMDt-18` |
| `booking_incidents` | 12 | `F2joBvbATli_mSEXEMDt-51` |

## users

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `CJYxWaz2PEXsALEdqlrQ-3` |
| 2 | `name` | — | `CJYxWaz2PEXsALEdqlrQ-6` |
| 3 | `email` | — | `CJYxWaz2PEXsALEdqlrQ-9` |
| 4 | `phone` | — | `CJYxWaz2PEXsALEdqlrQ-12` |
| 5 | `password_hash` | — | `CJYxWaz2PEXsALEdqlrQ-15` |
| 6 | `role` | — | `CJYxWaz2PEXsALEdqlrQ-18` |
| 7 | `avatar` | — | `CJYxWaz2PEXsALEdqlrQ-21` |
| 8 | `is_verified` | — | `CJYxWaz2PEXsALEdqlrQ-24` |
| 9 | `status` | — | `CJYxWaz2PEXsALEdqlrQ-27` |
| 10 | `created_at` | — | `CJYxWaz2PEXsALEdqlrQ-30` |
| 11 | `updated_at` | — | `CJYxWaz2PEXsALEdqlrQ-33` |

## business_profiles

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `CJYxWaz2PEXsALEdqlrQ-37` |
| 2 | `user_id` | — | `CJYxWaz2PEXsALEdqlrQ-40` |
| 3 | `business_name` | — | `CJYxWaz2PEXsALEdqlrQ-43` |
| 4 | `tax_code` | — | `CJYxWaz2PEXsALEdqlrQ-46` |
| 5 | `business_address` | — | `CJYxWaz2PEXsALEdqlrQ-49` |
| 6 | `business_license_url` | — | `CJYxWaz2PEXsALEdqlrQ-52` |
| 7 | `description` | — | `CJYxWaz2PEXsALEdqlrQ-55` |
| 8 | `status` | — | `CJYxWaz2PEXsALEdqlrQ-58` |
| 9 | `rejection_reason` | — | `CJYxWaz2PEXsALEdqlrQ-61` |
| 10 | `approved_at` | — | `CJYxWaz2PEXsALEdqlrQ-64` |
| 11 | `created_at` | — | `CJYxWaz2PEXsALEdqlrQ-67` |
| 12 | `updated_at` | — | `CJYxWaz2PEXsALEdqlrQ-70` |

## services

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `CJYxWaz2PEXsALEdqlrQ-74` |
| 2 | `provider_id` | — | `CJYxWaz2PEXsALEdqlrQ-77` |
| 3 | `category` | — | `CJYxWaz2PEXsALEdqlrQ-80` |
| 4 | `name` | — | `CJYxWaz2PEXsALEdqlrQ-86` |
| 5 | `description` | — | `CJYxWaz2PEXsALEdqlrQ-89` |
| 6 | `price` | — | `CJYxWaz2PEXsALEdqlrQ-92` |
| 7 | `price_from` | — | `CJYxWaz2PEXsALEdqlrQ-95` |
| 8 | `price_to` | — | `CJYxWaz2PEXsALEdqlrQ-98` |
| 9 | `capacity` | — | `CJYxWaz2PEXsALEdqlrQ-101` |
| 10 | `star_rating` | — | `CJYxWaz2PEXsALEdqlrQ-104` |
| 11 | `amenities` | — | `CJYxWaz2PEXsALEdqlrQ-107` |
| 12 | `policies` | — | `CJYxWaz2PEXsALEdqlrQ-110` |
| 13 | `province` | — | `CJYxWaz2PEXsALEdqlrQ-113` |
| 14 | `ward` | — | `CJYxWaz2PEXsALEdqlrQ-116` |
| 15 | `street` | — | `CJYxWaz2PEXsALEdqlrQ-119` |
| 16 | `latitude` | — | `CJYxWaz2PEXsALEdqlrQ-122` |
| 17 | `longitude` | — | `CJYxWaz2PEXsALEdqlrQ-125` |
| 18 | `thumbnail_url` | — | `CJYxWaz2PEXsALEdqlrQ-128` |
| 19 | `images` | — | `CJYxWaz2PEXsALEdqlrQ-131` |
| 20 | `rating` | — | `CJYxWaz2PEXsALEdqlrQ-134` |
| 21 | `status` | — | `CJYxWaz2PEXsALEdqlrQ-137` |
| 22 | `rejection_reason` | — | `CJYxWaz2PEXsALEdqlrQ-140` |
| 23 | `created_at` | — | `CJYxWaz2PEXsALEdqlrQ-143` |
| 24 | `updated_at` | — | `CJYxWaz2PEXsALEdqlrQ-146` |

## tour_custom_requests

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `IolQLlJez9LnykiPAneI-3` |
| 2 | `user_id` | — | `IolQLlJez9LnykiPAneI-6` |
| 3 | `agency_id` | — | `F2joBvbATli_mSEXEMDt-6` |
| 4 | `contact_name` | — | `IolQLlJez9LnykiPAneI-9` |
| 5 | `contact_email` | — | `IolQLlJez9LnykiPAneI-12` |
| 6 | `contact_phone` | — | `IolQLlJez9LnykiPAneI-15` |
| 7 | `destination` | — | `IolQLlJez9LnykiPAneI-18` |
| 8 | `departure_date` | — | `IolQLlJez9LnykiPAneI-21` |
| 9 | `return_date` | — | `IolQLlJez9LnykiPAneI-24` |
| 10 | `number_of_participants` | — | `IolQLlJez9LnykiPAneI-27` |
| 11 | `budget_per_person` | — | `IolQLlJez9LnykiPAneI-30` |
| 12 | `hotel_rating_requirement` | — | `IolQLlJez9LnykiPAneI-33` |
| 13 | `special_requirements` | — | `IolQLlJez9LnykiPAneI-36` |
| 14 | `status` | — | `IolQLlJez9LnykiPAneI-39` |
| 15 | `created_at` | — | `IolQLlJez9LnykiPAneI-42` |
| 16 | `updated_at` | — | `IolQLlJez9LnykiPAneI-45` |

## tour_custom_request_agencies

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `IolQLlJez9LnykiPAneI-49` |
| 2 | `request_id` | — | `IolQLlJez9LnykiPAneI-52` |
| 3 | `agency_id` | — | `IolQLlJez9LnykiPAneI-55` |
| 4 | `is_host` | — | `IolQLlJez9LnykiPAneI-58` |
| 5 | `stage_area` | — | `IolQLlJez9LnykiPAneI-61` |
| 6 | `suggested_budget` | — | `IolQLlJez9LnykiPAneI-64` |
| 7 | `communication_notes` | — | `IolQLlJez9LnykiPAneI-67` |
| 8 | `status` | — | `IolQLlJez9LnykiPAneI-70` |
| 9 | `assigned_at` | — | `IolQLlJez9LnykiPAneI-73` |
| 10 | `responded_at` | — | `IolQLlJez9LnykiPAneI-76` |

## tours

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `nT-pTPnVr-UvncDkvP_g-3` |
| 2 | `agency_id` | — | `nT-pTPnVr-UvncDkvP_g-6` |
| 3 | `custom_request_id` | — | `nT-pTPnVr-UvncDkvP_g-9` |
| 4 | `tour_code` | — | `nT-pTPnVr-UvncDkvP_g-12` |
| 5 | `name` | — | `nT-pTPnVr-UvncDkvP_g-15` |
| 6 | `destination` | — | `nT-pTPnVr-UvncDkvP_g-18` |
| 7 | `duration_tour` | — | `nT-pTPnVr-UvncDkvP_g-21` |
| 8 | `operation_period` | — | `nT-pTPnVr-UvncDkvP_g-24` |
| 9 | `duration_days` | — | `nT-pTPnVr-UvncDkvP_g-27` |
| 10 | `duration_nights` | — | `nT-pTPnVr-UvncDkvP_g-30` |
| 11 | `baseprice` | — | `nT-pTPnVr-UvncDkvP_g-33` |
| 12 | `min_participants` | — | `nT-pTPnVr-UvncDkvP_g-36` |
| 13 | `max_participants` | — | `nT-pTPnVr-UvncDkvP_g-39` |
| 14 | `diemnoibat` | — | `nT-pTPnVr-UvncDkvP_g-42` |
| 15 | `inclusions` | — | `nT-pTPnVr-UvncDkvP_g-45` |
| 16 | `exclusions` | — | `nT-pTPnVr-UvncDkvP_g-48` |
| 17 | `policies` | — | `nT-pTPnVr-UvncDkvP_g-51` |
| 18 | `message` | — | `nT-pTPnVr-UvncDkvP_g-54` |
| 19 | `thumbnail_urls` | — | `nT-pTPnVr-UvncDkvP_g-57` |
| 20 | `image_urls` | — | `nT-pTPnVr-UvncDkvP_g-60` |
| 21 | `status` | — | `nT-pTPnVr-UvncDkvP_g-63` |
| 22 | `visibility` | — | `nT-pTPnVr-UvncDkvP_g-66` |
| 23 | `visibility` | — | `i8IDv60cwcrwSPCYD2tw-21` |
| 24 | `is_request` | — | `nT-pTPnVr-UvncDkvP_g-69` |
| 25 | `version` | — | `nT-pTPnVr-UvncDkvP_g-72` |
| 26 | `change_note` | — | `nT-pTPnVr-UvncDkvP_g-75` |
| 27 | `is_shared_to_customer` | — | `nT-pTPnVr-UvncDkvP_g-78` |
| 28 | `is_ai_generated` | — | `nT-pTPnVr-UvncDkvP_g-81` |
| 29 | `created_at` | — | `nT-pTPnVr-UvncDkvP_g-84` |
| 30 | `updated_at` | — | `nT-pTPnVr-UvncDkvP_g-87` |

## tour_pricing_tiers

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `IWlLsS_bMDUl_yZlNZCF-3` |
| 2 | `tour_id` | — | `IWlLsS_bMDUl_yZlNZCF-6` |
| 3 | `agency_id` | — | `IWlLsS_bMDUl_yZlNZCF-9` |
| 4 | `tier_name` | — | `IWlLsS_bMDUl_yZlNZCF-12` |
| 5 | `min_age` | — | `IWlLsS_bMDUl_yZlNZCF-15` |
| 6 | `max_age` | — | `IWlLsS_bMDUl_yZlNZCF-18` |
| 7 | `price` | — | `IWlLsS_bMDUl_yZlNZCF-21` |
| 8 | `display_order` | — | `IWlLsS_bMDUl_yZlNZCF-24` |

## tour_timeline

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `IWlLsS_bMDUl_yZlNZCF-28` |
| 2 | `tour_id` | — | `IWlLsS_bMDUl_yZlNZCF-31` |
| 3 | `day_number` | — | `IWlLsS_bMDUl_yZlNZCF-34` |
| 4 | `title` | — | `IWlLsS_bMDUl_yZlNZCF-37` |
| 5 | `description` | — | `IWlLsS_bMDUl_yZlNZCF-40` |

## tourist_attractions

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `IWlLsS_bMDUl_yZlNZCF-44` |
| 2 | `tour_timeline_id` | — | `IWlLsS_bMDUl_yZlNZCF-47` |
| 3 | `agency_id` | — | `IWlLsS_bMDUl_yZlNZCF-50` |
| 4 | `name_location` | — | `IWlLsS_bMDUl_yZlNZCF-53` |

## tour_meals

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `iVWCHMw1oBkdcXWiyxXV-3` |
| 2 | `tour_timeline_id` | — | `iVWCHMw1oBkdcXWiyxXV-6` |
| 3 | `agency_id` | — | `iVWCHMw1oBkdcXWiyxXV-9` |
| 4 | `meal_type` | — | `iVWCHMw1oBkdcXWiyxXV-12` |
| 5 | `restaurant_name` | — | `iVWCHMw1oBkdcXWiyxXV-15` |
| 6 | `description` | — | `iVWCHMw1oBkdcXWiyxXV-18` |
| 7 | `is_default` | — | `iVWCHMw1oBkdcXWiyxXV-21` |
| 8 | `price_difference` | — | `iVWCHMw1oBkdcXWiyxXV-24` |
| 9 | `created_at` | — | `iVWCHMw1oBkdcXWiyxXV-27` |
| 10 | `updated_at` | — | `iVWCHMw1oBkdcXWiyxXV-30` |

## tour_accommodations

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `nDmuiOsB0o0tNeiBgKZg-3` |
| 2 | `tour_id` | — | `nDmuiOsB0o0tNeiBgKZg-6` |
| 3 | `agency_id` | — | `nDmuiOsB0o0tNeiBgKZg-9` |
| 4 | `destination_name` | — | `nDmuiOsB0o0tNeiBgKZg-12` |
| 5 | `hotel_name` | — | `nDmuiOsB0o0tNeiBgKZg-15` |
| 6 | `star_rating` | — | `nDmuiOsB0o0tNeiBgKZg-18` |
| 7 | `nights_count` | — | `nDmuiOsB0o0tNeiBgKZg-21` |
| 8 | `is_default` | — | `nDmuiOsB0o0tNeiBgKZg-24` |
| 9 | `price_difference` | — | `nDmuiOsB0o0tNeiBgKZg-27` |
| 10 | `address_notes` | — | `nDmuiOsB0o0tNeiBgKZg-30` |
| 11 | `created_at` | — | `nDmuiOsB0o0tNeiBgKZg-33` |
| 12 | `updated_at` | — | `nDmuiOsB0o0tNeiBgKZg-36` |

## tour_versions

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `A6IPY3i-jTjWFG4SZj7q-28` |
| 2 | `tour_id` | — | `A6IPY3i-jTjWFG4SZj7q-31` |
| 3 | `created_by` | — | `A6IPY3i-jTjWFG4SZj7q-34` |
| 4 | `version` | — | `A6IPY3i-jTjWFG4SZj7q-37` |
| 5 | `change_note` | — | `A6IPY3i-jTjWFG4SZj7q-40` |
| 6 | `price` | — | `A6IPY3i-jTjWFG4SZj7q-43` |
| 7 | `tour_snapshot` | — | `A6IPY3i-jTjWFG4SZj7q-46` |
| 8 | `created_at` | — | `A6IPY3i-jTjWFG4SZj7q-49` |

## bookings

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `HEe_iAG-CRYb-oDf0PpP-3` |
| 2 | `customer_id` | — | `HEe_iAG-CRYb-oDf0PpP-6` |
| 3 | `tour_id` | — | `HEe_iAG-CRYb-oDf0PpP-9` |
| 4 | `design_request_id` | — | `HEe_iAG-CRYb-oDf0PpP-12` |
| 5 | `booking_code` | — | `HEe_iAG-CRYb-oDf0PpP-15` |
| 6 | `departure_date` | — | `HEe_iAG-CRYb-oDf0PpP-18` |
| 7 | `contact_full_name` | — | `HEe_iAG-CRYb-oDf0PpP-21` |
| 8 | `contact_phone` | — | `HEe_iAG-CRYb-oDf0PpP-24` |
| 9 | `contact_email` | — | `HEe_iAG-CRYb-oDf0PpP-27` |
| 10 | `contact_note` | — | `HEe_iAG-CRYb-oDf0PpP-30` |
| 11 | `payment_status` | — | `HEe_iAG-CRYb-oDf0PpP-33` |
| 12 | `has_customization` | — | `HEe_iAG-CRYb-oDf0PpP-36` |
| 13 | `original_total_price` | — | `HEe_iAG-CRYb-oDf0PpP-39` |
| 14 | `total_price` | — | `HEe_iAG-CRYb-oDf0PpP-42` |
| 15 | `status` | — | `HEe_iAG-CRYb-oDf0PpP-45` |
| 16 | `cancel_reason` | — | `HEe_iAG-CRYb-oDf0PpP-48` |
| 17 | `cancelled_at` | — | `HEe_iAG-CRYb-oDf0PpP-51` |
| 18 | `created_at` | — | `HEe_iAG-CRYb-oDf0PpP-54` |
| 19 | `updated_at` | — | `HEe_iAG-CRYb-oDf0PpP-57` |

## booking_agencies

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `I2L0zsXnWkuPudD3Rc1s-3` |
| 2 | `booking_id` | — | `I2L0zsXnWkuPudD3Rc1s-6` |
| 3 | `agency_id` | — | `I2L0zsXnWkuPudD3Rc1s-9` |
| 4 | `is_host` | — | `I2L0zsXnWkuPudD3Rc1s-12` |
| 5 | `original_amount` | — | `I2L0zsXnWkuPudD3Rc1s-15` |
| 6 | `final_amount` | — | `I2L0zsXnWkuPudD3Rc1s-18` |
| 7 | `platform_fee` | — | `I2L0zsXnWkuPudD3Rc1s-21` |
| 8 | `net_payout` | — | `I2L0zsXnWkuPudD3Rc1s-24` |
| 9 | `settlement_status` | — | `I2L0zsXnWkuPudD3Rc1s-27` |
| 10 | `payout_transferred_at` | — | `I2L0zsXnWkuPudD3Rc1s-30` |
| 11 | `bank_reference_code` | — | `I2L0zsXnWkuPudD3Rc1s-33` |
| 12 | `created_at` | — | `I2L0zsXnWkuPudD3Rc1s-36` |
| 13 | `updated_at` | — | `I2L0zsXnWkuPudD3Rc1s-39` |

## booking_assigned_guides

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `s7awg47pFv2taVHxR5dV-3` |
| 2 | `booking_id` | — | `s7awg47pFv2taVHxR5dV-6` |
| 3 | `guide_id` | — | `s7awg47pFv2taVHxR5dV-9` |
| 4 | `agency_id` | — | `s7awg47pFv2taVHxR5dV-12` |
| 5 | `role` | — | `s7awg47pFv2taVHxR5dV-15` |
| 6 | `notes` | — | `s7awg47pFv2taVHxR5dV-18` |
| 7 | `assigned_at` | — | `s7awg47pFv2taVHxR5dV-21` |

## booking_participants

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `QCptvn9GrJm7jptMbFHz-3` |
| 2 | `booking_id` | — | `QCptvn9GrJm7jptMbFHz-6` |
| 3 | `agency_id` | — | `QCptvn9GrJm7jptMbFHz-9` |
| 4 | `assigned_guide_id` | — | `QCptvn9GrJm7jptMbFHz-12` |
| 5 | `checked_by` | — | `QCptvn9GrJm7jptMbFHz-15` |
| 6 | `participant_index` | — | `QCptvn9GrJm7jptMbFHz-18` |
| 7 | `is_primary` | — | `QCptvn9GrJm7jptMbFHz-21` |
| 8 | `full_name` | — | `QCptvn9GrJm7jptMbFHz-24` |
| 9 | `date_of_birth` | — | `QCptvn9GrJm7jptMbFHz-27` |
| 10 | `gender` | — | `QCptvn9GrJm7jptMbFHz-30` |
| 11 | `identity_card_number` | — | `QCptvn9GrJm7jptMbFHz-33` |
| 12 | `phone` | — | `QCptvn9GrJm7jptMbFHz-36` |
| 13 | `note` | — | `QCptvn9GrJm7jptMbFHz-39` |
| 14 | `tier_name` | — | `QCptvn9GrJm7jptMbFHz-42` |
| 15 | `price` | — | `QCptvn9GrJm7jptMbFHz-45` |
| 16 | `attendance_status` | — | `QCptvn9GrJm7jptMbFHz-48` |
| 17 | `checked_at` | — | `QCptvn9GrJm7jptMbFHz-51` |
| 18 | `status` | — | `QCptvn9GrJm7jptMbFHz-54` |
| 19 | `status_note` | — | `QCptvn9GrJm7jptMbFHz-57` |
| 20 | `created_at` | — | `QCptvn9GrJm7jptMbFHz-60` |
| 21 | `updated_at` | — | `QCptvn9GrJm7jptMbFHz-63` |

## booking_timelines

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `HTmh5X-JGo4QGTcfSQfJ-3` |
| 2 | `booking_id` | — | `HTmh5X-JGo4QGTcfSQfJ-6` |
| 3 | `day_number` | — | `HTmh5X-JGo4QGTcfSQfJ-9` |
| 4 | `title` | — | `HTmh5X-JGo4QGTcfSQfJ-12` |
| 5 | `description` | — | `HTmh5X-JGo4QGTcfSQfJ-15` |
| 6 | `created_at` | — | `HTmh5X-JGo4QGTcfSQfJ-18` |

## booking_timeline_attractions

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `HTmh5X-JGo4QGTcfSQfJ-22` |
| 2 | `booking_timeline_id` | — | `HTmh5X-JGo4QGTcfSQfJ-25` |
| 3 | `original_location_name` | — | `HTmh5X-JGo4QGTcfSQfJ-28` |
| 4 | `customized_location_name` | — | `HTmh5X-JGo4QGTcfSQfJ-31` |
| 5 | `is_customized` | — | `HTmh5X-JGo4QGTcfSQfJ-34` |
| 6 | `customer_note` | — | `HTmh5X-JGo4QGTcfSQfJ-37` |
| 7 | `price_difference` | — | `HTmh5X-JGo4QGTcfSQfJ-40` |
| 8 | `status` | — | `HTmh5X-JGo4QGTcfSQfJ-43` |
| 9 | `attendance_status` | — | `F2joBvbATli_mSEXEMDt-9` |
| 10 | `agency_id` | — | `F2joBvbATli_mSEXEMDt-12` |
| 11 | `guide_id` | — | `F2joBvbATli_mSEXEMDt-15` |

## booking_timeline_meals

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `Bqe4v-GgHtqsdSj7iR87-3` |
| 2 | `booking_timeline_id` | — | `Bqe4v-GgHtqsdSj7iR87-6` |
| 3 | `provider_id` | — | `Bqe4v-GgHtqsdSj7iR87-9` |
| 4 | `meal_type` | — | `Bqe4v-GgHtqsdSj7iR87-12` |
| 5 | `original_restaurant_name` | — | `Bqe4v-GgHtqsdSj7iR87-15` |
| 6 | `customized_restaurant_name` | — | `Bqe4v-GgHtqsdSj7iR87-18` |
| 7 | `price_difference` | — | `Bqe4v-GgHtqsdSj7iR87-21` |
| 8 | `is_customized` | — | `Bqe4v-GgHtqsdSj7iR87-24` |
| 9 | `customer_note` | — | `Bqe4v-GgHtqsdSj7iR87-27` |
| 10 | `status` | — | `Bqe4v-GgHtqsdSj7iR87-30` |

## booking_accommodations

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `4lJ9q3R-2pdJ9qNqJ2PT-3` |
| 2 | `booking_id` | — | `4lJ9q3R-2pdJ9qNqJ2PT-6` |
| 3 | `provider_id` | — | `4lJ9q3R-2pdJ9qNqJ2PT-9` |
| 4 | `destination` | — | `4lJ9q3R-2pdJ9qNqJ2PT-12` |
| 5 | `original_hotel_name` | — | `4lJ9q3R-2pdJ9qNqJ2PT-15` |
| 6 | `original_stars` | — | `4lJ9q3R-2pdJ9qNqJ2PT-18` |
| 7 | `customized_hotel_name` | — | `4lJ9q3R-2pdJ9qNqJ2PT-21` |
| 8 | `customized_stars` | — | `4lJ9q3R-2pdJ9qNqJ2PT-24` |
| 9 | `nights_count` | — | `4lJ9q3R-2pdJ9qNqJ2PT-27` |
| 10 | `price_difference` | — | `4lJ9q3R-2pdJ9qNqJ2PT-30` |
| 11 | `is_customized` | — | `4lJ9q3R-2pdJ9qNqJ2PT-33` |
| 12 | `customer_note` | — | `4lJ9q3R-2pdJ9qNqJ2PT-36` |
| 13 | `status` | — | `4lJ9q3R-2pdJ9qNqJ2PT-39` |

## payment_transactions

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `btViULTvZb2oLbnIi7mX-3` |
| 2 | `booking_id` | — | `btViULTvZb2oLbnIi7mX-6` |
| 3 | `payment_request_id` | — | `btViULTvZb2oLbnIi7mX-9` |
| 4 | `transaction_code` | — | `btViULTvZb2oLbnIi7mX-12` |
| 5 | `payment_method` | — | `btViULTvZb2oLbnIi7mX-15` |
| 6 | `amount` | — | `btViULTvZb2oLbnIi7mX-18` |
| 7 | `status` | — | `btViULTvZb2oLbnIi7mX-21` |
| 8 | `payer_name` | — | `btViULTvZb2oLbnIi7mX-24` |
| 9 | `payment_proof_url` | — | `btViULTvZb2oLbnIi7mX-27` |
| 10 | `paid_at` | — | `btViULTvZb2oLbnIi7mX-30` |

## booking_price_adjustments

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `uj6FksDJq3zV4mt5sn0H-3` |
| 2 | `booking_id` | — | `uj6FksDJq3zV4mt5sn0H-6` |
| 3 | `agency_id` | — | `uj6FksDJq3zV4mt5sn0H-9` |
| 4 | `adjusted_by` | — | `uj6FksDJq3zV4mt5sn0H-12` |
| 5 | `previous_total_price` | — | `uj6FksDJq3zV4mt5sn0H-15` |
| 6 | `adjustment_amount` | — | `uj6FksDJq3zV4mt5sn0H-18` |
| 7 | `new_total_price` | — | `uj6FksDJq3zV4mt5sn0H-21` |
| 8 | `reason` | — | `uj6FksDJq3zV4mt5sn0H-24` |
| 9 | `created_at` | — | `uj6FksDJq3zV4mt5sn0H-27` |

## feedbacks

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `E7ltDoCkuKSttiEcwemx-3` |
| 2 | `booking_id` | — | `E7ltDoCkuKSttiEcwemx-6` |
| 3 | `customer_id` | — | `E7ltDoCkuKSttiEcwemx-9` |
| 4 | `agency_id` | — | `E7ltDoCkuKSttiEcwemx-12` |
| 5 | `overall_rating` | — | `E7ltDoCkuKSttiEcwemx-15` |
| 6 | `overall_comment` | — | `E7ltDoCkuKSttiEcwemx-18` |
| 7 | `agency_rating` | — | `E7ltDoCkuKSttiEcwemx-21` |
| 8 | `agency_comment` | — | `E7ltDoCkuKSttiEcwemx-24` |
| 9 | `images` | — | `E7ltDoCkuKSttiEcwemx-27` |
| 10 | `agency_reply` | — | `E7ltDoCkuKSttiEcwemx-30` |
| 11 | `replied_at` | — | `E7ltDoCkuKSttiEcwemx-33` |
| 12 | `status` | — | `E7ltDoCkuKSttiEcwemx-36` |
| 13 | `created_at` | — | `E7ltDoCkuKSttiEcwemx-39` |
| 14 | `updated_at` | — | `E7ltDoCkuKSttiEcwemx-42` |

## complaints

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `E7ltDoCkuKSttiEcwemx-46` |
| 2 | `booking_id` | — | `E7ltDoCkuKSttiEcwemx-49` |
| 3 | `customer_id` | — | `E7ltDoCkuKSttiEcwemx-52` |
| 4 | `agency_id` | — | `E7ltDoCkuKSttiEcwemx-55` |
| 5 | `admin_id` | — | `E7ltDoCkuKSttiEcwemx-58` |
| 6 | `subject` | — | `E7ltDoCkuKSttiEcwemx-61` |
| 7 | `description` | — | `E7ltDoCkuKSttiEcwemx-64` |
| 8 | `evidence_urls` | — | `E7ltDoCkuKSttiEcwemx-67` |
| 9 | `agency_response` | — | `E7ltDoCkuKSttiEcwemx-70` |
| 10 | `agency_responded_at` | — | `E7ltDoCkuKSttiEcwemx-73` |
| 11 | `admin_notes` | — | `E7ltDoCkuKSttiEcwemx-76` |
| 12 | `status` | — | `E7ltDoCkuKSttiEcwemx-79` |
| 13 | `resolved_at` | — | `E7ltDoCkuKSttiEcwemx-82` |
| 14 | `created_at` | — | `E7ltDoCkuKSttiEcwemx-85` |
| 15 | `updated_at` | — | `E7ltDoCkuKSttiEcwemx-88` |
| 16 | `deleted_at` | — | `E7ltDoCkuKSttiEcwemx-91` |

## payment_requests

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `horShYxWzOGdj-Vwt23i-3` |
| 2 | `booking_id` | — | `horShYxWzOGdj-Vwt23i-6` |
| 3 | `created_by` | — | `horShYxWzOGdj-Vwt23i-9` |
| 4 | `description` | — | `horShYxWzOGdj-Vwt23i-12` |
| 5 | `amount` | — | `horShYxWzOGdj-Vwt23i-15` |
| 6 | `due_date` | — | `horShYxWzOGdj-Vwt23i-18` |
| 7 | `status` | — | `horShYxWzOGdj-Vwt23i-21` |
| 8 | `created_at` | — | `horShYxWzOGdj-Vwt23i-24` |
| 9 | `paid_at` | — | `horShYxWzOGdj-Vwt23i-27` |

## booking_attraction_checkins

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `F2joBvbATli_mSEXEMDt-21` |
| 2 | `booking_timeline_attraction_id` | — | `F2joBvbATli_mSEXEMDt-24` |
| 3 | `guide_id` | — | `F2joBvbATli_mSEXEMDt-27` |
| 4 | `agency_id` | — | `F2joBvbATli_mSEXEMDt-30` |
| 5 | `attendance_status` | — | `F2joBvbATli_mSEXEMDt-33` |
| 6 | `checked_at` | — | `F2joBvbATli_mSEXEMDt-36` |
| 7 | `photo_proof_url` | — | `F2joBvbATli_mSEXEMDt-39` |
| 8 | `notes` | — | `F2joBvbATli_mSEXEMDt-42` |
| 9 | `created_at` | — | `F2joBvbATli_mSEXEMDt-45` |
| 10 | `updated_at` | — | `F2joBvbATli_mSEXEMDt-48` |

## booking_incidents

| STT | Cột gốc | Dấu trong XML | Column cell ID |
|---:|---|---|---|
| 1 | `id` | PK | `F2joBvbATli_mSEXEMDt-54` |
| 2 | `booking_id` | — | `F2joBvbATli_mSEXEMDt-57` |
| 3 | `agency_id` | — | `F2joBvbATli_mSEXEMDt-60` |
| 4 | `reported_by` | — | `F2joBvbATli_mSEXEMDt-63` |
| 5 | `incident_type` | — | `F2joBvbATli_mSEXEMDt-66` |
| 6 | `title` | — | `F2joBvbATli_mSEXEMDt-69` |
| 7 | `description` | — | `F2joBvbATli_mSEXEMDt-72` |
| 8 | `status` | — | `F2joBvbATli_mSEXEMDt-75` |
| 9 | `evidence_urls` | — | `F2joBvbATli_mSEXEMDt-78` |
| 10 | `resolved_at` | — | `F2joBvbATli_mSEXEMDt-81` |
| 11 | `created_at` | — | `F2joBvbATli_mSEXEMDt-84` |
| 12 | `updated_at` | — | `F2joBvbATli_mSEXEMDt-87` |

## Các quan hệ được vẽ

Endpoint dưới đây được giải bằng cách lần `source`/`target` qua row/container tới bảng và cột, không dùng vị trí ảnh. Giữ nguyên chiều và arrow token. `ERmandOne` = một bắt buộc; `ERoneToMany` = một hoặc nhiều; `ERmany` = nhiều theo ký hiệu draw.io. Những marker này thể hiện ý đồ vẽ, không tự xác lập FK hay NULL của SQL Server. Không đảo chiều để làm cho sơ đồ có vẻ đúng.

| Edge ID | Source trong XML | Target trong XML | startArrow | endArrow |
|---|---|---|---|---|
| `i8IDv60cwcrwSPCYD2tw-16` | `bookings.customer_id` | `payment_transactions.booking_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-0` | `users.id` | `tour_custom_requests.user_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-1` | `tour_custom_requests.id` | `tour_custom_request_agencies.request_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-2` | `users.id` | `business_profiles.user_id` | `ERmandOne` | `ERmandOne` |
| `i8IDv60cwcrwSPCYD2tw-5` | `users.id` | `services.provider_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-6` | `bookings.id` | `booking_participants.booking_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-7` | `[MISSING]` | `booking_accommodations.booking_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-8` | `bookings.id` | `booking_assigned_guides.booking_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-10` | `bookings.id` | `booking_timelines.booking_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-11` | `booking_timelines.id` | `booking_timeline_meals.booking_timeline_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-12` | `booking_timelines.id` | `booking_timeline_attractions.booking_timeline_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-13` | `bookings.id` | `payment_requests.booking_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-14` | `bookings.id` | `complaints.booking_id` | `ERmandOne` | `ERmandOne` |
| `i8IDv60cwcrwSPCYD2tw-15` | `payment_requests.id` | `payment_transactions.payment_request_id` | `ERmandOne` | `ERmandOne` |
| `i8IDv60cwcrwSPCYD2tw-17` | `bookings.customer_id` | `booking_price_adjustments.booking_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-18` | `bookings.id` | `feedbacks.booking_id` | `ERmandOne` | `ERmandOne` |
| `i8IDv60cwcrwSPCYD2tw-22` | `bookings.id` | `booking_agencies.booking_id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-23` | `bookings.tour_id` | `tours.id` | `ERmandOne` | `ERoneToMany` |
| `i8IDv60cwcrwSPCYD2tw-24` | `bookings.design_request_id` | `tour_custom_requests.id` | `ERmandOne` | `ERmandOne` |
| `i8IDv60cwcrwSPCYD2tw-25` | `tours.id` | `tour_versions.tour_id` | `ERmandOne` | `ERmandOne` |
| `i8IDv60cwcrwSPCYD2tw-26` | `tours.id` | `tour_accommodations.tour_id` | `ERmandOne` | `ERoneToMany` |
| `CXZkSPaCkbFc99bHsFvJ-0` | `tours.id` | `tour_timeline.tour_id` | `ERmandOne` | `ERoneToMany` |
| `CXZkSPaCkbFc99bHsFvJ-1` | `tour_timeline.id` | `tourist_attractions.tour_timeline_id` | `ERmandOne` | `ERoneToMany` |
| `CXZkSPaCkbFc99bHsFvJ-3` | `tour_timeline.id` | `tour_meals.tour_timeline_id` | `ERmandOne` | `ERoneToMany` |
| `CXZkSPaCkbFc99bHsFvJ-4` | `tour_pricing_tiers.tour_id` | `tours.id` | `ERmany` | `ERmandOne` |
| `kpDPMsVqOmSjCqEeZoyg-1` | `tours.custom_request_id` | `tour_custom_requests.id` | `ERmandOne` | `ERmandOne` |
| `F2joBvbATli_mSEXEMDt-50` | `booking_timeline_attractions.id` | `booking_attraction_checkins.booking_timeline_attraction_id` | `ERmandOne` | `ERoneToMany` |
| `F2joBvbATli_mSEXEMDt-88` | `bookings.id` | `booking_incidents.booking_id` | `ERmandOne` | `ERoneToMany` |
| `jyDAtw3hkIaSTBou54Ei-0` | `users.id` | `booking_assigned_guides.guide_id` | `ERmandOne` | `ERoneToMany` |

### Bất thường đọc trực tiếp

- `i8IDv60cwcrwSPCYD2tw-7`: không có thuộc tính `source`; chỉ có tọa độ `sourcePoint`. Không đủ bằng chứng khẳng định quan hệ được vẽ là bookings → booking_accommodations.
- `i8IDv60cwcrwSPCYD2tw-16` và `-17` nối từ `bookings.customer_id` đến `payment_transactions.booking_id` và `booking_price_adjustments.booking_id`. Không được chuyển chúng thành FK trỏ customer_id; cột đó không phải PK/unique trong XML.
- `i8IDv60cwcrwSPCYD2tw-23`: chiều bookings.tour_id → tours.id nhưng marker một → nhiều ngược với quan hệ FK dự kiến. `-25`: tours → tour_versions lại vẽ một → một, mâu thuẫn nhiều version.
- `-14`, `-18` vẽ booking → complaint/feedback một → một. `-15` vẽ payment_request → transaction một → một, cần xác nhận khả năng nhiều lần thanh toán/thử lại. `-24` và `kpDPMsVqOmSjCqEeZoyg-1` vẽ custom request với booking/tour một → một; chưa đủ cơ sở chốt UNIQUE.
- `tours.visibility`: cell `nT-pTPnVr-UvncDkvP_g-66` và `i8IDv60cwcrwSPCYD2tw-21` cùng nhãn. Không tự xóa hay coi là hai khái niệm khác nhau.

## FK chỉ suy ra từ tên và nghiệp vụ

Các cột `agency_id` chưa có đường vẽ tới một bảng doanh nghiệp/tài khoản. `services.provider_id` được vẽ tới `users.id`; `booking_assigned_guides.guide_id` được vẽ tới `users.id`. Không có bảng `agencies`, `providers` hoặc `guides` trong baseline. Toàn bộ đích FK ứng viên được liệt kê theo từng cột tại schema proposal, bao gồm các cột không có đường nối; đó là suy luận được Q1/Q2 chốt đích nghiệp vụ sau Task0 nhưng không phải dữ kiện XML.

`customer_id`, `created_by`, `adjusted_by`, `reported_by`, `admin_id`, `checked_by` có đích ứng viên `users.id`; `booking_participants.assigned_guide_id` còn mơ hồ giữa `users.id` và `booking_assigned_guides.id`. `bookings.design_request_id` ứng viên tới `tour_custom_requests.id`. Không có `service_id` trong các bảng meal/accommodation/attraction nên không thể tuyên bố chúng đã liên kết catalogue services.

## Tái lập

`python docs/tools/source_audit.py --check` kiểm tra đủ bảng/cột/edge và các liên kết tài liệu. `python docs/tools/source_audit.py` xuất cấu trúc đã giải cùng nội dung nguồn để kiểm tra sâu (có thông tin cá nhân trong phiếu đăng ký; không công bố output). Script chỉ đọc nguồn. Generator Task0 đã đóng băng sau Q1–Q11; không chạy để ghi đè schema proposal hiện hành. Inventory này giữ nguyên dữ kiện XML, không tự sửa nguồn hoặc tạo migration.

## Phân loại bằng chứng cho từng FK ứng viên

Toàn bộ bảng dưới là **đích FK đề xuất**, không phải khai báo FK trong XML. Nhãn “cạnh đủ endpoint” chỉ xác nhận hai cột được nối, không xác nhận cardinality, NULL hoặc UNIQUE đúng. Các ID Q1/Q2 dẫn tới decisions. Cột không nằm trong bảng này không được đề xuất là FK ở Task 0.

| FK ứng viên | Đích đề xuất | Bằng chứng so với XML |
|---|---|---|
| `business_profiles.user_id` | users.id (role tương ứng; Q1/Q2) | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-2`; marker vẫn cần đối chiếu |
| `services.provider_id` | users.id (role tương ứng; Q1/Q2) | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-5`; marker vẫn cần đối chiếu |
| `tour_custom_requests.user_id` | users.id (role tương ứng; Q1/Q2) | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-0`; marker vẫn cần đối chiếu |
| `tour_custom_requests.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `tour_custom_request_agencies.request_id` | tour_custom_requests.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-1`; marker vẫn cần đối chiếu |
| `tour_custom_request_agencies.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `tours.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `tours.custom_request_id` | tour_custom_requests.id | Cạnh đủ endpoint: `kpDPMsVqOmSjCqEeZoyg-1`; marker vẫn cần đối chiếu |
| `tour_pricing_tiers.tour_id` | tours.id | Cạnh đủ endpoint: `CXZkSPaCkbFc99bHsFvJ-4`; marker vẫn cần đối chiếu |
| `tour_pricing_tiers.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `tour_timeline.tour_id` | tours.id | Cạnh đủ endpoint: `CXZkSPaCkbFc99bHsFvJ-0`; marker vẫn cần đối chiếu |
| `tourist_attractions.tour_timeline_id` | tour_timeline.id | Cạnh đủ endpoint: `CXZkSPaCkbFc99bHsFvJ-1`; marker vẫn cần đối chiếu |
| `tourist_attractions.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `tour_meals.tour_timeline_id` | tour_timeline.id | Cạnh đủ endpoint: `CXZkSPaCkbFc99bHsFvJ-3`; marker vẫn cần đối chiếu |
| `tour_meals.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `tour_accommodations.tour_id` | tours.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-26`; marker vẫn cần đối chiếu |
| `tour_accommodations.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `tour_versions.tour_id` | tours.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-25`; marker vẫn cần đối chiếu |
| `tour_versions.created_by` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `bookings.customer_id` | users.id (role tương ứng; Q1/Q2) | Cạnh thiếu/sai endpoint: `i8IDv60cwcrwSPCYD2tw-16`, `i8IDv60cwcrwSPCYD2tw-17`; FK đích chỉ suy luận |
| `bookings.tour_id` | tours.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-23`; marker vẫn cần đối chiếu |
| `bookings.design_request_id` | tour_custom_requests.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-24`; marker vẫn cần đối chiếu |
| `booking_agencies.booking_id` | bookings.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-22`; marker vẫn cần đối chiếu |
| `booking_agencies.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_assigned_guides.booking_id` | bookings.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-8`; marker vẫn cần đối chiếu |
| `booking_assigned_guides.guide_id` | users.id (role tương ứng; Q1/Q2) | Cạnh đủ endpoint: `jyDAtw3hkIaSTBou54Ei-0`; marker vẫn cần đối chiếu |
| `booking_assigned_guides.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_participants.booking_id` | bookings.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-6`; marker vẫn cần đối chiếu |
| `booking_participants.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_participants.assigned_guide_id` | booking_assigned_guides.id (đề xuất; cần chốt Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_participants.checked_by` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_timelines.booking_id` | bookings.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-10`; marker vẫn cần đối chiếu |
| `booking_timeline_attractions.booking_timeline_id` | booking_timelines.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-12`; marker vẫn cần đối chiếu |
| `booking_timeline_attractions.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_timeline_attractions.guide_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_timeline_meals.booking_timeline_id` | booking_timelines.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-11`; marker vẫn cần đối chiếu |
| `booking_timeline_meals.provider_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_accommodations.booking_id` | bookings.id | Cạnh thiếu/sai endpoint: `i8IDv60cwcrwSPCYD2tw-7`; FK đích chỉ suy luận |
| `booking_accommodations.provider_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `payment_transactions.booking_id` | bookings.id | Cạnh thiếu/sai endpoint: `i8IDv60cwcrwSPCYD2tw-16`; FK đích chỉ suy luận |
| `payment_transactions.payment_request_id` | payment_requests.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-15`; marker vẫn cần đối chiếu |
| `booking_price_adjustments.booking_id` | bookings.id | Cạnh thiếu/sai endpoint: `i8IDv60cwcrwSPCYD2tw-17`; FK đích chỉ suy luận |
| `booking_price_adjustments.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_price_adjustments.adjusted_by` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `feedbacks.booking_id` | bookings.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-18`; marker vẫn cần đối chiếu |
| `feedbacks.customer_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `feedbacks.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `complaints.booking_id` | bookings.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-14`; marker vẫn cần đối chiếu |
| `complaints.customer_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `complaints.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `complaints.admin_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `payment_requests.booking_id` | bookings.id | Cạnh đủ endpoint: `i8IDv60cwcrwSPCYD2tw-13`; marker vẫn cần đối chiếu |
| `payment_requests.created_by` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_attraction_checkins.booking_timeline_attraction_id` | booking_timeline_attractions.id | Cạnh đủ endpoint: `F2joBvbATli_mSEXEMDt-50`; marker vẫn cần đối chiếu |
| `booking_attraction_checkins.guide_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_attraction_checkins.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_incidents.booking_id` | bookings.id | Cạnh đủ endpoint: `F2joBvbATli_mSEXEMDt-88`; marker vẫn cần đối chiếu |
| `booking_incidents.agency_id` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
| `booking_incidents.reported_by` | users.id (role tương ứng; Q1/Q2) | Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt |
