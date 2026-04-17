import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

interface DriverLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

@Injectable()
export class DriverLocationService {
  private readonly logger = new Logger(DriverLocationService.name);
  private readonly DRIVER_LOCATION_TTL = 300; // 5 minutes
  private readonly DRIVER_ONLINE_TTL = 60; // 1 minute

  constructor(private redisService: RedisService) {}

  /**
   * Update driver location in Redis
   * Key format: driver:location:{driverId}
   */
  async updateDriverLocation(
    driverId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    const key = `driver:location:${driverId}`;
    const location: DriverLocation = {
      lat,
      lng,
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.set(key, JSON.stringify(location), this.DRIVER_LOCATION_TTL);
    this.logger.debug(`Updated location for driver ${driverId}: ${lat}, ${lng}`);
  }

  /**
   * Get driver's latest location
   */
  async getDriverLocation(driverId: string): Promise<DriverLocation | null> {
    const key = `driver:location:${driverId}`;
    const data = await this.redisService.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as DriverLocation;
    } catch (error) {
      this.logger.error(`Error parsing driver location for ${driverId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if driver is online
   */
  async isDriverOnline(driverId: string): Promise<boolean> {
    const key = `driver:online:${driverId}`;
    return this.redisService.exists(key);
  }

  /**
   * Set driver as online
   */
  async setDriverOnline(driverId: string): Promise<void> {
    const key = `driver:online:${driverId}`;
    await this.redisService.set(key, '1', this.DRIVER_ONLINE_TTL);
    
    // Refresh TTL periodically (this will be called on each location update)
    this.logger.debug(`Driver ${driverId} marked as online`);
  }

  /**
   * Set driver as offline and clear location
   */
  async setDriverOffline(driverId: string): Promise<void> {
    const onlineKey = `driver:online:${driverId}`;
    const locationKey = `driver:location:${driverId}`;

    await this.redisService.del(onlineKey);
    await this.redisService.del(locationKey);

    this.logger.debug(`Driver ${driverId} marked as offline`);
  }

  /**
   * Refresh driver online status (call this on location updates)
   */
  async refreshDriverOnlineStatus(driverId: string): Promise<void> {
    const key = `driver:online:${driverId}`;
    await this.redisService.set(key, '1', this.DRIVER_ONLINE_TTL);
  }

  /**
   * Get all online drivers
   */
  async getOnlineDrivers(): Promise<string[]> {
    const client = this.redisService.getClient();
    const keys = await client.keys('driver:online:*');
    
    // Extract driver IDs from keys
    return keys.map((key) => key.replace('driver:online:', ''));
  }

  /**
   * Get nearest online drivers to a location
   */
  async getNearestDrivers(
    lat: number,
    lng: number,
    limit: number = 5,
  ): Promise<Array<{ driverId: string; location: DriverLocation; distance: number }>> {
    const onlineDrivers = await this.getOnlineDrivers();
    const driversWithLocations: Array<{
      driverId: string;
      location: DriverLocation;
      distance: number;
    }> = [];

    for (const driverId of onlineDrivers) {
      const location = await this.getDriverLocation(driverId);
      if (location) {
        const distance = this.calculateDistance(
          lat,
          lng,
          location.lat,
          location.lng,
        );
        driversWithLocations.push({ driverId, location, distance });
      }
    }

    // Sort by distance and return top N
    return driversWithLocations
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

