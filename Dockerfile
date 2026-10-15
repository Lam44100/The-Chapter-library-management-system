FROM node:22.16.0-alpine AS frontend
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM maven:3.9.11-eclipse-temurin-21 AS backend
WORKDIR /workspace
COPY pom.xml ./
COPY src/main ./src/main
COPY --from=frontend /workspace/frontend/dist ./src/main/resources/static
RUN --mount=type=cache,target=/root/.m2 mvn -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S chapter && adduser -S chapter -G chapter
WORKDIR /app
COPY --from=backend /workspace/target/chapter-library-1.0.0.jar app.jar
USER chapter
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC"
EXPOSE 8080
HEALTHCHECK --interval=30s --start-period=90s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:${PORT:-8080}/actuator/health || exit 1
ENTRYPOINT ["java","-jar","/app/app.jar"]
