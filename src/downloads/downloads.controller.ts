import { Body, Controller, Get, Post } from "@nestjs/common";
import { DownloadsService } from "./downloads.service";

@Controller("downloads")
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Post()
  incrementDownloads(@Body("user_id") userId?: string) {
    return this.downloadsService.incrementCount(userId);
  }

  @Get()
  getDownloads() {
    return this.downloadsService.getTotalCount();
  }
}

