import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateDistance } from '../common/utils/distance.util';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.zone.findMany({
      orderBy: { minDistance: 'asc' },
    });
  }

  async findOne(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    return zone;
  }

  /**
   * Find zone based on distance
   * @param distance Distance in kilometers
   * @returns Zone or null if distance exceeds all zones
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
   * Calculate distance and find appropriate zone
   * @param pickupLat Latitude of pickup location
   * @param pickupLon Longitude of pickup location
   * @param deliveryLat Latitude of delivery location
   * @param deliveryLon Longitude of delivery location
   * @returns Object containing distance, zone, and fare
   */
  async calculateZoneAndFare(
    pickupLat: number,
    pickupLon: number,
    deliveryLat: number,
    deliveryLon: number,
  ) {
    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      pickupLat,
      pickupLon,
      deliveryLat,
      deliveryLon,
    );

    // Find appropriate zone
    const zone = await this.findZoneByDistance(distance);

    if (!zone) {
      throw new NotFoundException(
        `No zone found for distance ${distance} km. Maximum delivery distance is 10 km.`,
      );
    }

    return {
      distance,
      zone,
      fare: zone.price,
    };
  }
}

