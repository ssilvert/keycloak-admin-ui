import React, { useState, useEffect } from "react";
import _, { groupBy } from "lodash";
import {
  Button,
  ButtonVariant,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListCheck,
  Divider,
  Modal,
  ModalVariant,
  Select,
  SelectOption,
  SelectOptionObject,
  Stack,
  StackItem,
  Text,
  TextContent,
} from "@patternfly/react-core";

import { useTranslation } from "react-i18next";

import {
  JsonFileUpload,
  JsonFileUploadEvent,
} from "../components/json-file-upload/JsonFileUpload";

export type PartialImportProps = {
  open: boolean;
  toggleDialog: () => void;
};

// An exported JSON file can either be an array of realm objects
// or a single realm object.
type ImportedMultiRealm = [ImportedRealm?] | ImportedRealm;

// The actual imported json can have a lot more members,
// but these are the ones we care about.
type ImportedRealm = {
  id?: string;
  realm?: string;
  users?: [];
  clients?: [];
  groups?: [];
  identityProviders?: [];
  roles?: {
    realm?: [];
    client?: { [index: string]: [] };
  };
};

type NonRoleMember = "users" | "clients" | "groups" | "identityProviders";
type RoleMember = "roles.realm" | "roles.client";

type CollisionOption = "FAIL" | "SKIP" | "OVERWRITE";

export const PartialImportDialog = (props: PartialImportProps) => {
  const tRealm = useTranslation("realm-settings").t;
  const { t } = useTranslation("partial-import");
  const [importEnabled, setImportEnabled] = useState(false);
  const [isMultiRealm, setIsMultiRealm] = useState(false);
  const [importedFile, setImportedFile] = useState<ImportedMultiRealm>([]);
  const [isRealmSelectOpen, setIsRealmSelectOpen] = useState(false);
  const [isCollisionSelectOpen, setIsCollisionSelectOpen] = useState(false);
  const [collisionOption, setCollisionOption] = useState<CollisionOption>(
    "FAIL"
  );
  const [targetRealm, setTargetRealm] = useState<ImportedRealm>({});

  // when dialog opens or closes, reset importEnabled to false
  useEffect(() => {
    setImportEnabled(false);
  }, [props.open]);

  const handleFileChange = (
    value: string | File,
    filename: string,
    event: JsonFileUploadEvent
  ) => {
    setImportEnabled(value !== null);
    setIsMultiRealm(false);
    setImportedFile([]);
    setTargetRealm({});

    // if user pressed clear button reset importEnabled
    const nativeEvent = event.nativeEvent;
    if (
      nativeEvent instanceof MouseEvent &&
      !(nativeEvent instanceof DragEvent)
    ) {
      setImportEnabled(false);
      return;
    }

    let rawContent: ImportedMultiRealm = [];
    try {
      rawContent = JSON.parse(value as string);
      setImportedFile(rawContent);
    } catch (error) {
      // Ignore.  We need to be lenient on things like
      // "Unexpected end of JSON input".
    }

    if (rawContent instanceof Array && rawContent.length > 0) {
      setIsMultiRealm(rawContent.length > 1);
      setTargetRealm(rawContent[0] || {});
    } else {
      setIsMultiRealm(false);
      setTargetRealm((rawContent as ImportedRealm) || {});
    }
  };

  const handleRealmSelect = (
    event: React.ChangeEvent<Element> | React.MouseEvent<Element, MouseEvent>,
    realm: string | SelectOptionObject
  ) => {
    setTargetRealm(realm as ImportedRealm);
    setIsRealmSelectOpen(false);
  };

  const realmSelectOptions = () => {
    if (!isMultiRealm) return [];

    const mapper = (realm: ImportedRealm) => {
      return (
        <SelectOption key={realm.id} value={realm}>
          {realm.realm || realm.id}
        </SelectOption>
      );
    };

    return (importedFile as [ImportedRealm]).map(mapper);
  };

  const handleCollisionSelect = (
    event: React.ChangeEvent<Element> | React.MouseEvent<Element, MouseEvent>,
    option: string | SelectOptionObject
  ) => {
    setCollisionOption(option as CollisionOption);
    setIsCollisionSelectOpen(false);
  };

  const collisionOptions = () => {
    return [
      <SelectOption key="fail" value="FAIL">
        {t("FAIL")}
      </SelectOption>,
      <SelectOption key="skip" value="SKIP">
        {t("SKIP")}
      </SelectOption>,
      <SelectOption key="overwrite" value="OVERWRITE">
        {t("OVERWRITE")}
      </SelectOption>,
    ];
  };

  const targetHasMembers = () => {
    return (
      targetHasMember("users") ||
      targetHasMember("groups") ||
      targetHasMember("clients") ||
      targetHasMember("identityProviders") ||
      targetHasRealmRoles() ||
      targetHasClientRoles()
    );
  };

  const targetHasMember = (member: NonRoleMember) => {
    return (
      targetRealm &&
      targetRealm[member] instanceof Array &&
      targetRealm[member]!.length > 0
    );
  };

  const targetHasRoles = () => {
    return targetRealm && targetRealm.hasOwnProperty("roles");
  };

  const targetHasRealmRoles = () => {
    return (
      targetHasRoles() &&
      targetRealm.roles!.realm instanceof Array &&
      targetRealm.roles!.realm.length > 0
    );
  };

  const targetHasClientRoles = () => {
    return (
      targetHasRoles() &&
      targetRealm.roles!.hasOwnProperty("client") &&
      Object.keys(targetRealm.roles!.client!).length > 0
    );
  };

  const itemCount = (member: NonRoleMember | RoleMember) => {
    if (!importEnabled) return 0;

    if (targetHasRealmRoles() && member === "roles.realm")
      return targetRealm.roles!.realm!.length;

    if (targetHasClientRoles() && member == "roles.client")
      return clientRolesCount(targetRealm.roles!.client!);

    if (!targetRealm[member as NonRoleMember]) return 0;

    return targetRealm[member as NonRoleMember]!.length;
  };

  const clientRolesCount = (clientRoles: { [index: string]: [] }) => {
    let total = 0;
    for (let clientName in clientRoles) {
      total += clientRoles[clientName].length;
    }
    return total;
  };

  const memberDataListItem = (
    member: NonRoleMember | RoleMember,
    memberDisplayName: string
  ) => {
    return (
      <DataListItem aria-labelledby={`${member}-list-item`}>
        <DataListItemRow>
          <DataListCheck
            aria-labelledby={`${member}-checkbox`}
            name={`${member}-checkbox`}
          />
          <DataListItemCells
            dataListCells={[
              <DataListCell key={member}>
                <span>
                  {itemCount(member)} {memberDisplayName}
                </span>
              </DataListCell>,
            ]}
          />
        </DataListItemRow>
      </DataListItem>
    );
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      title={tRealm("partialImport")}
      isOpen={props.open}
      onClose={props.toggleDialog}
      actions={[
        <Button
          id="modal-import"
          data-testid="import-button"
          key="import"
          isDisabled={!importEnabled || !targetHasMembers()}
          onClick={() => {
            props.toggleDialog();
          }}
        >
          {t("import")}
        </Button>,
        <Button
          id="modal-cancel"
          data-testid="cancel-button"
          key="cancel"
          variant={ButtonVariant.link}
          onClick={() => {
            props.toggleDialog();
          }}
        >
          {t("common:cancel")}
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          <TextContent>
            <Text>{t("partialImportHeaderText")}</Text>
          </TextContent>
        </StackItem>
        <StackItem>
          <JsonFileUpload
            id="partial-import-file"
            onChange={handleFileChange}
          />
        </StackItem>

        {importEnabled && targetHasMembers() && (
          <>
            <StackItem>
              <Divider />
            </StackItem>
            {isMultiRealm && (
              <StackItem>
                <Text>Select realm:</Text>
                <Select
                  isOpen={isRealmSelectOpen}
                  onToggle={() => setIsRealmSelectOpen(!isRealmSelectOpen)}
                  onSelect={handleRealmSelect}
                  placeholderText={targetRealm.realm || targetRealm.id}
                >
                  {realmSelectOptions()}
                </Select>
              </StackItem>
            )}
            <StackItem>
              <Text>Choose the resources you want to import:</Text>
              <DataList aria-label="Resources to import" isCompact>
                {targetHasMember("users") &&
                  memberDataListItem("users", "users")}
                {targetHasMember("groups") &&
                  memberDataListItem("groups", "groups")}
                {targetHasMember("clients") &&
                  memberDataListItem("clients", "clients")}
                {targetHasMember("identityProviders") &&
                  memberDataListItem("identityProviders", "identity providers")}
                {targetHasRealmRoles() &&
                  memberDataListItem("roles.realm", "realm roles")}
                {targetHasClientRoles() &&
                  memberDataListItem("roles.client", "client roles")}
              </DataList>
            </StackItem>
            <StackItem>
              <Text>
                If a resource already exists, specify what should be done:
              </Text>
              <Select
                isOpen={isCollisionSelectOpen}
                onToggle={() => {
                  setIsCollisionSelectOpen(!isCollisionSelectOpen);
                }}
                onSelect={handleCollisionSelect}
                placeholderText={t(collisionOption)}
              >
                {collisionOptions()}
              </Select>
            </StackItem>
          </>
        )}
      </Stack>
    </Modal>
  );
};
