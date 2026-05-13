import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateDistance } from '../common/utils/distance.util';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

/** نقطة جغرافية {lat, lng} */
interface LatLng { lat: number; lng: number; }

/**
 * Ray-casting algorithm — يتحقق إذا كانت النقطة داخل المضلع.
 * يُستخدم لتحديد الزون الجغرافي للمطعم أو الزبون.
 */
function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const { lat: py, lng: px } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { lat: iy, lng: ix } = polygon[i];
    const { lat: jy, lng: jx } = polygon[j];
    const intersect =
      iy > py !== jy > py &&
      px < ((jx - ix) * (py - iy)) / (jy - iy) + ix;
    if (intersect) inside = !inside;
  }
  return inside;
}

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async create(createZoneDto: CreateZoneDto) {
    // Check if zone name already exists
    const existing = await this.prisma.zone.findUnique({
      where: { name: createZoneDto.name },
    });

    if (existing) {
      throw new BadRequestException('Zone name already exists');
    }

    // Validate: either polygon OR (minDistance and maxDistance) must be provided
    if (!createZoneDto.polygon && (!createZoneDto.minDistance || !createZoneDto.maxDistance)) {
      throw new BadRequestException('Either polygon or minDistance/maxDistance must be provided');
    }

    // If polygon is provided, validate it has at least 3 points
    if (createZoneDto.polygon && createZoneDto.polygon.length < 3) {
      throw new BadRequestException('Polygon must have at least 3 points');
    }

    return this.prisma.zone.create({
      data: {
        name: createZoneDto.name,
        minDistance: createZoneDto.minDistance,
        maxDistance: createZoneDto.maxDistance,
        price: createZoneDto.price,
        polygon: createZoneDto.polygon ? JSON.stringify(createZoneDto.polygon) : null,
      },
    });
  }

  async findAll() {
    const zones = await this.prisma.zone.findMany({
      orderBy: { name: 'asc' },
    });

    // Parse polygon JSON strings
    return zones.map(zone => ({
      ...zone,
      polygon: zone.polygon ? JSON.parse(zone.polygon) : null,
    }));
  }

  async findOne(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    // Parse polygon JSON string
    return {
      ...zone,
      polygon: zone.polygon ? JSON.parse(zone.polygon) : null,
    };
  }

  async update(id: string, updateZoneDto: UpdateZoneDto) {
    await this.findOne(id); // Verify zone exists

    if (updateZoneDto.name) {
      const existing = await this.prisma.zone.findUnique({
        where: { name: updateZoneDto.name },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException('Zone name already exists');
      }
    }

    // Validate polygon if provided
    if (updateZoneDto.polygon && updateZoneDto.polygon.length < 3) {
      throw new BadRequestException('Polygon must have at least 3 points');
    }

    const data: any = { ...updateZoneDto };
    if (updateZoneDto.polygon) {
      data.polygon = JSON.stringify(updateZoneDto.polygon);
    }

    const updated = await this.prisma.zone.update({
      where: { id },
      data,
    });

    return {
      ...updated,
      polygon: updated.polygon ? JSON.parse(updated.polygon) : null,
    };
  }

  async remove(id: string) {
    await this.findOne(id); // Verify zone exists

    // Check if zone is used in any orders
    const orders = await this.prisma.order.findMany({
      where: { zoneId: id },
    });

    if (orders.length > 0) {
      throw new BadRequestException('Cannot delete zone that has been used in orders');
    }

    return this.prisma.zone.delete({
      where: { id },
    });
  }

  /**
   * Find zone based on distance
   */
  async findZoneByDistance(distance: number) {
    const zone = await this.prisma.zone.findFirst({
      where: {
        minDistance: { lte: distance },
        maxDistance: { gte: distance },
      },
    });
    return zone;
  }

  /**
   * يجد الزون الذي تقع فيه النقطة (lat, lng) عبر polygon أولاً،
   * ثم يعود للبحث بالمسافة من نقطة مرجعية إذا لم يوجد polygon.
   */
  async findZoneByPoint(lat: number, lng: number, refLat?: number, refLng?: number) {
    const allZones = await this.prisma.zone.findMany();
    // 1. ابحث في الزونات التي عندها polygon
    for (const z of allZones) {
      if (!z.polygon) continue;
      try {
        const poly: LatLng[] = JSON.parse(z.polygon);
        if (poly.length >= 3 && isPointInPolygon({ lat, lng }, poly)) {
          return z;
        }
      } catch {
        // polygon تالف — تجاهله
      }
    }
    // 2. fallback: بحث بالمسافة من النقطة المرجعية (مثلاً المستودع/المركز)
    if (refLat !== undefined && refLng !== undefined) {
      const dist = calculateDistance(refLat, refLng, lat, lng);
      return this.findZoneByDistance(dist);
    }
    return null;
  }

  /**
   * يحسب سعر التوصيل الحقيقي بجمع سعر زون المطعم + سعر زون الزبون.
   * - إذا كان الاثنان في نفس الزون → سعر الزون مرة واحدة.
   * - إذا كانا في زونين مختلفين → مجموع السعرين.
   * - إذا لم يُعثر على زون بالـ polygon → يعود للحساب بالمسافة الكلية (سلوك قديم).
   */
  async calculateZoneAndFare(
    pickupLat: number,
    pickupLon: number,
    deliveryLat: number,
    deliveryLon: number,
  ) {
    const distance = calculateDistance(pickupLat, pickupLon, deliveryLat, deliveryLon);

    // حاول تحديد زون المطعم وزون الزبون بالـ polygon
    const pickupZone  = await this.findZoneByPoint(pickupLat,  pickupLon);
    const deliveryZone = await this.findZoneByPoint(deliveryLat, deliveryLon);

    // ─── الحالة 1: وُجد الزونان ───
    if (pickupZone && deliveryZone) {
      const samezone = pickupZone.id === deliveryZone.id;
      const fare = samezone
        ? pickupZone.price
        : pickupZone.price + deliveryZone.price;

      return {
        distance,
        pickupZone: { ...pickupZone, polygon: pickupZone.polygon ? JSON.parse(pickupZone.polygon) : null },
        deliveryZone: { ...deliveryZone, polygon: deliveryZone.polygon ? JSON.parse(deliveryZone.polygon) : null },
        zone: { ...pickupZone, polygon: pickupZone.polygon ? JSON.parse(pickupZone.polygon) : null }, // للتوافق مع الكود القديم
        fare,
        fareBreakdown: samezone
          ? { pickupZonePrice: pickupZone.price, deliveryZonePrice: 0, note: 'نفس المنطقة' }
          : { pickupZonePrice: pickupZone.price, deliveryZonePrice: deliveryZone.price, note: 'منطقتان مختلفتان' },
      };
    }

    // ─── الحالة 2: fallback بالمسافة الكلية ───
    const zone = await this.findZoneByDistance(distance);
    if (!zone) {
      throw new NotFoundException(
        `لا توجد منطقة توصيل تغطي المسافة ${distance.toFixed(2)} كم.`,
      );
    }

    return {
      distance,
      pickupZone: null,
      deliveryZone: null,
      zone: { ...zone, polygon: zone.polygon ? JSON.parse(zone.polygon) : null },
      fare: zone.price,
      fareBreakdown: { pickupZonePrice: zone.price, deliveryZonePrice: 0, note: 'حساب بالمسافة الكلية' },
    };
  }
}

