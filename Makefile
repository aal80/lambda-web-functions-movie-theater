NAME := lwf-movie-theater

deploy:
	cd src && npm ci --omit=dev
	aws lambda-web deploy --name $(NAME) --code ./src --create \
		--auth-type ApplicationManaged --timeout-seconds 900
	@$(MAKE) --no-print-directory urls

# Separate target so the endpoint lookup runs after deploy finishes:
# make expands $(shell) in a recipe before running any of its lines.
urls:
	$(eval DOMAIN := $(shell aws lambda-web get-web-function-endpoint --function-name $(NAME) --endpoint-name dev --query domainName --output text))
	@echo ""
	@echo "Open the theater in a browser:"
	@echo "  https://$(DOMAIN)"
	@echo ""
	@echo "Or watch in a terminal:"
	@echo "  curl -N https://$(DOMAIN)/starwars"
	@echo "  curl -N https://$(DOMAIN)/rickrolling"

destroy:
	aws lambda-web delete-web-function --function-name $(NAME)
	aws lambda-web wait web-function-deleted --function-name $(NAME)

dev:
	cd src && npm i && nodemon
