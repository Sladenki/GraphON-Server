import { Controller, Get, Post } from "@nestjs/common";
import { DownloadsService } from "./downloads.service";

@Controller("downloads")
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Post()
  incrementDownloads() {
    return this.downloadsService.incrementCount();
  }

  @Get()
  getDownloads() {
    return this.downloadsService.getTotalCount();
  }
}

