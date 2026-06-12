# ServerSentinel — Context

## Project Overview

ServerSentinel is a honeypot system that mimics real servers to capture and analyze attacker behavior. It includes an LLM-powered response generator for realistic interactions and an automated nightly pipeline that produces threat reports published to a static blog.

## Glossary

| Term | Definition |
|------|-----------|
| **Honeypot** | A decoy server that simulates real services (HTTP, SSH, FTP, MySQL) to lure and monitor attackers. |
| **Attack** | Any interaction with a honeypot service from an external source. Includes login attempts, command execution, HTTP requests, SQL queries. |
| **Attacker** | An external entity (bot or human) that interacts with a honeypot service. Identified by source IP address. |
| **Session** | A sequence of attacks from the same source IP within a time window. Groups related attacker activity. |
| **Payload** | The data sent by an attacker to a honeypot service. HTTP body, SSH commands, FTP commands, SQL queries. |
| **Real-time Response** | LLM-generated response to HTTP payloads during the attack. Aimed at keeping the attacker engaged. |
| **Nightly Pipeline** | Automated process that runs daily via system cron. Reads attacks from DB, analyzes with LLM, generates and publishes a threat report. |
| **Threat Report** | Daily HTML document summarizing all captured attacks. Includes executive summary, per-IP detail, trends, and IOCs. |
| **Static Blog** | Collection of generated HTML files served directly. Each report is a standalone HTML page. |
| **Full Simulation** | All honeypot services respond realistically. HTTP serves fake admin panel pages, SSH provides a fake shell, FTP shows fake directories, MySQL responds to handshake and basic queries. |

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Web Framework | Fastify |
| LLM Runtime | Ollama |
| LLM Model | Qwen 2.5:1.5b |
| Database | SQLite |
| Containerization | Docker Compose |
| Blog Format | Static HTML from Markdown |
| Scheduling | System cron |
| Target Hardware | Raspberry Pi 4, Mini PC |

## Services Exposed

- **HTTP/HTTPS** — Fake admin panel (login page, dashboard, API routes)
- **SSH** — Fake shell that logs commands
- **FTP** — Fake directory listing with fictional files
- **MySQL** — Handshake and basic query responses

## Deployment

- Runs on Raspberry Pi 4 and Mini PC
- Docker Compose for orchestration
- `.env` file for configuration variables
- Public access via port forwarding or Cloudflare Tunnel
- Blog is publicly accessible
